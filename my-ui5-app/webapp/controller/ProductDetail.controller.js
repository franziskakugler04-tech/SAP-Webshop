sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/formatter",
    "sap/ui/model/json/JSONModel"
], function (BaseController, models, formatter, JSONModel) {
    "use strict";

    return BaseController.extend("my.ui5.app.controller.ProductDetail", {

        formatter: formatter,

        /**
         * Baut die Modelle der Seite auf und lädt den Produktkatalog nach
         */
        onInit: function () {
            this.setModel(models.createCategoriesModel(), "categories");
            this.setModel(new JSONModel({}), "product");

            var oProductsModel = models.createProductsModel();
            oProductsModel.dataLoaded().then(function () {
                this._aAllProducts = oProductsModel.getData().Products;
                if (this._sProductId) {
                    this._showProductFromRoute();
                }
            }.bind(this));

            this.getRouter().getRoute("productDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Macht die Empfehlungskacheln als Ganzes anklickbar
         */
        onAfterRendering: function () {
            this.attachCardNavigation(".recommendationCard", "recommendations", this.navigateToProductDetail.bind(this));
        },

        /**
         * Führt aus der Seitenleiste zur gefilterten Produktübersicht
         * @param {sap.ui.base.Event} oEvent
         */
        onCategorySelect: function (oEvent) {
            var sCategoryId = oEvent.getParameter("listItem").getBindingContext("categories").getObject().CategoryId;
            this.getRouter().navTo("products", { category: sCategoryId });
        },

        /**
         * Übernimmt Produkt und Kategorie aus der Route. Die Kategorie kommt aus der
         * Route und nicht aus dem Produkt, damit die Seitenleiste sofort markiert wird
         * @param {sap.ui.base.Event} oEvent
         */
        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this._sProductId = oArgs.productId;
            this._sCategoryId = oArgs.category;

            this._selectCategoryInList(this._sCategoryId);

            if (this._aAllProducts) {
                this._showProductFromRoute();
            }
        },

        /**
         * Sucht das Produkt zur Route und baut Detail- und Empfehlungsmodell auf
         */
        _showProductFromRoute: function () {
            var aProducts = this._aAllProducts || [];
            var oProduct = aProducts.find(function (oKandidat) {
                return oKandidat.ProductId === this._sProductId;
            }.bind(this));

            if (!oProduct) {
                // Unbekannte oder veraltete ProductId in der URL - zurück zur Übersicht
                this.getRouter().navTo("products", { category: this._sCategoryId || "ALL" });
                return;
            }

            // Eigene Kopie fürs Modell, damit die Bewertungsdaten die zentrale
            // Produktliste nicht verändern
            var oProductData = Object.assign({}, oProduct);

            if (!this._oRatingState) {
                this._oRatingState = {};
            }
            var oState = this._oRatingState[oProduct.ProductId] || { submitted: false, value: 0 };

            oProductData.userRatingValue = oState.value;
            oProductData.userRatingSubmitted = oState.submitted;
            // Simuliert: RatingCount nur lokal hochzählen, nicht in den Rohdaten
            oProductData.RatingCount = oProduct.RatingCount + (oState.submitted ? 1 : 0);

            this.getModel("product").setData(oProductData);
            this.loadRecommendations(aProducts, [oProduct.ProductId]);
        },

        /**
         * Übernimmt die vom Nutzer gewählte Sternezahl ins Modell
         * @param {sap.ui.base.Event} oEvent
         */
        onUserRatingChange: function (oEvent) {
            var iValue = oEvent.getParameter("value");
            this.getModel("product").setProperty("/userRatingValue", iValue);
        },

        /**
         * Schickt die Bewertung ab und zählt sie mit
         */
        onSubmitRating: function () {
            var oModel = this.getModel("product");
            var iValue = oModel.getProperty("/userRatingValue");

            if (!iValue) {
                return;
            }

            oModel.setProperty("/userRatingSubmitted", true);
            oModel.setProperty("/RatingCount", oModel.getProperty("/RatingCount") + 1);

            // Zustand merken, damit er beim erneuten Aufruf derselben Seite bleibt
            this._oRatingState[this._sProductId] = { submitted: true, value: iValue };
        },

        /**
         * Legt das angezeigte Produkt in den Warenkorb
         */
        onAddToCart: function () {
            this.addToCart(this.getModel("product").getData());
        },

        /**
         * Merkt das angezeigte Produkt oder nimmt es aus der Merkliste
         */
        onFavoritePress: function () {
            var oProduct = this.getModel("product").getData();
            this.toggleWishlistItem(oProduct);
        },

        /**
         * Zurück zur Produktübersicht, gefiltert auf die Kategorie des Produkts
         */
        onNavBack: function () {
            this.getRouter().navTo("products", { category: this._sCategoryId || "ALL" });
        }
    });
});