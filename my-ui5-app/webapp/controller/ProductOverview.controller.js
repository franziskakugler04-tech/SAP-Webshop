sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/formatter",
    "../model/cart",
    "sap/ui/model/json/JSONModel"
], function (BaseController, models, formatter, cart, JSONModel) {
    "use strict";

    // Wie viele Produkte pro Seite angezeigt werden (Pagination)
    var PAGE_SIZE = 12;

    return BaseController.extend("my.ui5.app.controller.ProductOverview", {

        formatter: formatter,

        /**
         * Baut alle Modelle der Seite auf und lädt die Produkt-Mockdaten;
         * auf das Laden wird über dataLoaded() gewartet
         */
        onInit: function () {
            var oProductsModel = models.createProductsModel();
            this.setModel(models.createCategoriesModel(), "categories");
            this.setModel(new JSONModel({ SubCategories: [] }), "subcategories");

            this._sCategoryId = "ALL";
            this._sSortKey = "popularity";
            this._iCurrentPage = 1;

            this.setModel(new JSONModel({ Products: [] }), "pagedProducts");
            this.setModel(new JSONModel({
                currentPage: 1,
                totalPages: 1,
                totalCount: 0,
                isFirstPage: true,
                isLastPage: true,
                pageLabel: this.getResourceBundle().getText("paginationPageLabel", [1, 1]),
                resultCountLabel: this.getResourceBundle().getText("paginationResultCountLabel", [0])
            }), "pagination");

            oProductsModel.dataLoaded().then(function () {
                this._onProductsLoaded(oProductsModel.getData().Products);
            }.bind(this));

            this._initPriceSlider();

            // Auf Routen-Treffer reagieren, um den Kategorie-Parameter zu lesen
            this.getRouter().getRoute("products").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Übernimmt den Kategorie-Parameter der Route und baut die Seitenleiste neu auf.
         * Sind die Produkte noch nicht da, filtert _onProductsLoaded später nach
         * @param {sap.ui.base.Event} oEvent
         */
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sCategory = oArgs.category;
            var oQuery = oArgs["?query"] || {};

            this._sCategoryId = sCategory || "ALL";
            this._selectCategoryInList(this._sCategoryId);
            this._buildSubCategoryModel();
            this._iCurrentPage = 1;

            // Nur überschreiben, wenn ein neuer Suchbegriff mitkommt - ohne
            // else-Zweig bleibt die Suche beim Zurücknavigieren erhalten
            if (oQuery.search !== undefined) {
                this._sHeaderSearchQuery = oQuery.search || "";
                var oTitleSearch = this.byId("titleSearch");
                if (oTitleSearch) {
                    oTitleSearch.setValue(this._sHeaderSearchQuery);
                }
            }

            if (this._aAllProducts) {
                this._refreshProductList();
            }
        },

        /**
         * Baut alle von den Produkten abhängigen Modelle auf und zeigt danach
         * die erste gefilterte und sortierte Produktseite an
         * @param {object[]} aProducts kompletter Produktkatalog
         */
        _onProductsLoaded: function (aProducts) {
            this._aAllProducts = aProducts || [];
            this._buildManufacturerModel(this._aAllProducts);
            this._buildSubCategoryModel();
            this.loadRecommendations(this._aAllProducts);
            this._initPriceSlider();
            this._refreshProductList();
        },

        /**
         * Navigiert zurück auf die Startseite
         */
        onNavBack: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Übernimmt die in der Seitenleiste gewählte Kategorie, springt auf Seite 1
         * und baut die Unterkategorie-Liste passend dazu neu auf
         * @param {sap.ui.base.Event} oEvent
         */
        onCategorySelect: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            this._sCategoryId = oSelectedItem.getBindingContext("categories").getObject().CategoryId;
            this._sHeaderSearchQuery = "";   // Header-Suche aufheben
            this._iCurrentPage = 1;
            this._buildSubCategoryModel();
            this._refreshProductList();
            this._closeCategoryDropdown();
        },

        /**
         * Macht Produktkacheln und Empfehlungen als Ganzes anklickbar
         */
        onAfterRendering: function () {
            this.attachCardNavigation(".productCard", "pagedProducts", this.navigateToProductDetail.bind(this));
            this.attachCardNavigation(".recommendationCard", "recommendations", this.navigateToProductDetail.bind(this));
        },

        /**
         * Klappt auf Mobile das Filterpanel auf und zu
         */
        onToggleFilterDropdown: function () {
            var oContent = this.byId("filterDropdownContent");
            var oButton = this.byId("filterToggleButton");
            var bWasOpen = oContent.hasStyleClass("dropdownOpen");

            oContent.toggleStyleClass("dropdownOpen");
            oButton.setIcon(bWasOpen ? "sap-icon://slim-arrow-down" : "sap-icon://slim-arrow-up");

            this._closeCategoryDropdown();
        },

        /**
         * Schließt das Filter-Dropdown, falls es gerade offen ist
         */
        _closeFilterDropdown: function () {
            var oContent = this.byId("filterDropdownContent");
            var oButton = this.byId("filterToggleButton");
            if (oContent && oContent.hasStyleClass("dropdownOpen")) {
                oContent.removeStyleClass("dropdownOpen");
                oButton.setIcon("sap-icon://slim-arrow-down");
            }
        },

        /**
         * Merkt das Produkt der Kachel oder nimmt es wieder aus der Merkliste
         * @param {sap.ui.base.Event} oEvent
         */
        onFavoritePress: function (oEvent) {
            var oProduct = oEvent.getSource().getBindingContext("pagedProducts").getObject();
            this.toggleWishlistItem(oProduct);
        },

        /**
         * Legt das Produkt der angeklickten Kachel in den Warenkorb. Welches gemeint
         * ist, steht im Bindungskontext - alle Kacheln stammen aus einer Vorlage
         * @param {sap.ui.base.Event} oEvent
         */
        onAddToCart: function (oEvent) {
            var oProduct = oEvent.getSource().getBindingContext("pagedProducts").getObject();
            this.addToCart(oProduct);
        },

        /**
         * Setzt den Preis-Slider auf den vollen Bereich von 0 bis zum teuersten Produkt
         */
        _initPriceSlider: function () {
            var oSlider = this.byId("priceRangeSlider");
            if (!oSlider) {
                return;
            }
            var fMaxPrice = this._getMaxProductPrice();
            oSlider.setMin(0);
            oSlider.setMax(fMaxPrice);
            oSlider.setRange([0, fMaxPrice]);
            this._updatePriceRangeLabel();
        },

        /**
         * Ermittelt den höchsten tatsächlich zu zahlenden Preis aller Produkte
         * @returns {float} 25 als Rückfall, solange nichts geladen ist
         */
        _getMaxProductPrice: function () {
            var aProducts = this._aAllProducts || [];

            if (!aProducts.length) {
                return 25;
            }
            var fMax = aProducts.reduce(function (fCurrentMax, oProduct) {
                var fPrice = cart.getEffectivePrice(oProduct);
                return fPrice > fCurrentMax ? fPrice : fCurrentMax;
            }, 0);

            // Auf volle Euro aufrunden, damit der Slider bei runden Werten endet
            return Math.ceil(fMax);
        },

        /**
         * Schreibt den eingestellten Preisbereich als Text unter den Slider
         */
        _updatePriceRangeLabel: function () {
            var oSlider = this.byId("priceRangeSlider");
            var oLabel = this.byId("priceRangeLabel");

            if (!oSlider || !oLabel) {
                return;
            }

            var aRange = oSlider.getRange();
            var fMin = Math.min(parseFloat(aRange[0]), parseFloat(aRange[1]));
            var fMax = Math.max(parseFloat(aRange[0]), parseFloat(aRange[1]));
            oLabel.setText(formatter.formatPrice(fMin) + " - " + formatter.formatPrice(fMax));
        },

        /**
         * Aktualisiert das Preis-Label, während am Slider gezogen wird
         */
        onPriceRangeLiveChange: function () {
            this._updatePriceRangeLabel();
        },

        /**
         * Wendet alle im Filterpanel eingestellten Filter an
         */
        onFilterPress: function () {
            this._sHeaderSearchQuery = "";   // Header-Suche aufheben
            this._iCurrentPage = 1;
            this._refreshProductList();
            this._closeFilterDropdown();
        },

        /**
         * Baut die Herstellerauswahl des Filterpanels aus den geladenen Produkten
         * @param {object[]} aProducts kompletter Produktkatalog
         */
        _buildManufacturerModel: function (aProducts) {
            var aManufacturerNames = aProducts
                .map(function (oProduct) { return oProduct.Manufacturer; })
                .filter(function (sValue, iIndex, aArray) {
                    return sValue && aArray.indexOf(sValue) === iIndex;
                })
                .sort();

            var aItems = [{ Key: "", Text: this.getResourceBundle().getText("filterAllManufacturers") }];
            aManufacturerNames.forEach(function (sName) {
                aItems.push({ Key: sName, Text: sName });
            });

            this.setModel(new JSONModel({ Manufacturers: aItems }), "manufacturers");
        },

        /**
         * Baut die Unterkategorie-Auswahl neu auf, bezogen auf die aktive Hauptkategorie
         */
        _buildSubCategoryModel: function () {
            var aProducts = this._aAllProducts || [];
            var aFiltered = this._sCategoryId && this._sCategoryId !== "ALL"
                ? aProducts.filter(function (oProduct) { return oProduct.Category === this._sCategoryId; }.bind(this))
                : aProducts;

            var aSubCategories = aFiltered
                .map(function (oProduct) { return oProduct.SubCategory; })
                .filter(function (sValue, iIndex, aArray) {
                    return sValue && aArray.indexOf(sValue) === iIndex;
                })
                .sort();

            var aItems = [{ Key: "", Text: this.getResourceBundle().getText("all") }];
            aSubCategories.forEach(function (sValue) {
                aItems.push({ Key: sValue, Text: sValue });
            });

            var oSubCategoryModel = this.getModel("subcategories");
            if (oSubCategoryModel) {
                oSubCategoryModel.setProperty("/SubCategories", aItems);
            }

            var oSubCategorySelect = this.byId("subCategorySelect");
            if (oSubCategorySelect) {
                oSubCategorySelect.setSelectedKey("");
            }
        },

        /**
         * Prüft ein einzelnes Produkt gegen alle aktiven Filter
         * @param {object} oProduct Datensatz aus Products.json
         * @returns {boolean} true, wenn das Produkt angezeigt werden soll
         */
        _productMatchesFilters: function (oProduct) {
            if (this._sCategoryId && this._sCategoryId !== "ALL" && oProduct.Category !== this._sCategoryId) {
                return false;
            }

            var sTitle = this.byId("titleSearch").getValue();
            var sManufacturerSearch = this.byId("manufacturerSearch").getValue();
            var sHeaderSearch = this._sHeaderSearchQuery || "";
            var sSearchText = (sHeaderSearch || sTitle || "").trim();

            if (sSearchText) {
                var sSearchLower = sSearchText.toLowerCase();
                var bNameMatches = oProduct.Name.toLowerCase().indexOf(sSearchLower) !== -1;
                var bManufacturerMatches = oProduct.Manufacturer.toLowerCase().indexOf(sSearchLower) !== -1;

                if (!bNameMatches && !bManufacturerMatches) {
                    return false;
                }
            }

            if (sManufacturerSearch) {
                if (oProduct.Manufacturer.toLowerCase().indexOf(sManufacturerSearch.toLowerCase()) === -1) {
                    return false;
                }
            }

            var sManufacturerKey = this.byId("manufacturerSelect").getSelectedKey();
            if (sManufacturerKey && oProduct.Manufacturer !== sManufacturerKey) {
                return false;
            }

            var sColor = this.byId("colorSelect").getSelectedKey();
            if (sColor && oProduct.Color !== sColor) {
                return false;
            }

            var sSubCategory = this.byId("subCategorySelect").getSelectedKey();
            if (sSubCategory && oProduct.SubCategory !== sSubCategory) {
                return false;
            }

            var oSlider = this.byId("priceRangeSlider");
            var aRange = oSlider.getRange();
            var fMin = Math.min(parseFloat(aRange[0]), parseFloat(aRange[1]));
            var fMax = Math.max(parseFloat(aRange[0]), parseFloat(aRange[1]));
            var fEffectivePrice = cart.getEffectivePrice(oProduct);
            if (fEffectivePrice < fMin || fEffectivePrice > fMax) {
                return false;
            }

            var bOnlyDiscounts = this.byId("discountCheckBox").getSelected();
            if (bOnlyDiscounts && !oProduct.IsOnSale) {
                return false;
            }

            var sAvailabilityKey = this.byId("availabilitySelect").getSelectedKey();
            if (sAvailabilityKey && oProduct.AvailabilityKey !== sAvailabilityKey) {
                return false;
            }

            return true;
        },

        /**
         * Sortierte Kopie des Katalogs; das Original bleibt unverändert.
         * Unbekannte Schlüssel fallen auf "popularity" zurück
         * @param {object[]} aProducts zu sortierende Produkte
         * @param {string} sKey Sortierschlüssel aus der Auswahlliste
         * @returns {object[]}
         */
        _sortProducts: function (aProducts, sKey) {
            var aSorted = aProducts.slice();

            switch (sKey) {
                case "ratingDesc":
                    aSorted.sort(function (a, b) { return b.Rating - a.Rating; });
                    break;
                case "priceAsc":
                    // Effektiver Preis, also OnSalePrice bei Angeboten
                    aSorted.sort(function (a, b) { return cart.getEffectivePrice(a) - cart.getEffectivePrice(b); });
                    break;
                case "priceDesc":
                    aSorted.sort(function (a, b) { return cart.getEffectivePrice(b) - cart.getEffectivePrice(a); });
                    break;
                case "popularity":
                default:
                    aSorted.sort(function (a, b) { return b.RatingCount - a.RatingCount; });
                    break;
            }

            return aSorted;
        },

        /**
         * Zentrale Methode der Seite: filtert, sortiert, schneidet die aktuelle Seite
         * heraus und schreibt Produkte und Pagination-Angaben in die Modelle
         */
        _refreshProductList: function () {
            var aAll = this._aAllProducts || [];
            var aFiltered = aAll.filter(this._productMatchesFilters.bind(this));
            var aSorted = this._sortProducts(aFiltered, this._sSortKey);

            var iTotalCount = aSorted.length;
            var iTotalPages = Math.max(1, Math.ceil(iTotalCount / PAGE_SIZE));

            if (this._iCurrentPage > iTotalPages) {
                this._iCurrentPage = iTotalPages;
            }
            if (this._iCurrentPage < 1) {
                this._iCurrentPage = 1;
            }

            var iStart = (this._iCurrentPage - 1) * PAGE_SIZE;
            var aPageItems = aSorted.slice(iStart, iStart + PAGE_SIZE);

            this.getModel("pagedProducts").setProperty("/Products", aPageItems);

            var oPaginationModel = this.getModel("pagination");
            oPaginationModel.setProperty("/currentPage", this._iCurrentPage);
            oPaginationModel.setProperty("/totalPages", iTotalPages);
            oPaginationModel.setProperty("/totalCount", iTotalCount);
            oPaginationModel.setProperty("/isFirstPage", this._iCurrentPage <= 1);
            oPaginationModel.setProperty("/isLastPage", this._iCurrentPage >= iTotalPages);
            oPaginationModel.setProperty("/pageLabel", this.getResourceBundle().getText("paginationPageLabel", [this._iCurrentPage, iTotalPages]));
            oPaginationModel.setProperty("/resultCountLabel", this.getResourceBundle().getText("paginationResultCountLabel", [iTotalCount]));
        },

        /**
         * Blättert eine Seite zurück, sofern nicht schon die erste aktiv ist
         */
        onPrevPage: function () {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage--;
                this._refreshProductList();
            }
        },

        /**
         * Blättert eine Seite vor, sofern nicht schon die letzte aktiv ist
         */
        onNextPage: function () {
            var oPaginationModel = this.getModel("pagination");
            if (this._iCurrentPage < oPaginationModel.getProperty("/totalPages")) {
                this._iCurrentPage++;
                this._refreshProductList();
            }
        },

        /**
         * Setzt alle Filterfelder auf ihren Ausgangszustand zurück
         */
        onResetPress: function () {
            this._sHeaderSearchQuery = "";
            this.byId("titleSearch").setValue("");
            this.byId("manufacturerSearch").setValue("");
            this.byId("manufacturerSelect").setSelectedKey("");
            this.byId("colorSelect").setSelectedKey("");
            this.byId("subCategorySelect").setSelectedKey("");

            this._initPriceSlider();

            this.byId("discountCheckBox").setSelected(false);
            this.byId("availabilitySelect").setSelectedKey("");

            this._iCurrentPage = 1;
            this._refreshProductList();
        },

        /**
         * Übernimmt die in der Auswahlliste gewählte Sortierung
         * @param {sap.ui.base.Event} oEvent
         */
        onSortChange: function (oEvent) {
            this._sSortKey = oEvent.getParameter("selectedItem").getKey();
            this._iCurrentPage = 1;
            this._refreshProductList();
        }
    });
});