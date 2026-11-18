sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../model/validator",
    "../model/cart",
    "../model/wishlist",
    "../model/formatter",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, validator, cart, wishlist, formatter, MessageToast, JSONModel) {
    "use strict";

    // Anzeigetexte zu den gespeicherten Schlüsseln; sie stehen hier, weil
    // Profilseite und Kasse dieselben Werte anzeigen
    var oCountryKeys = {
        DE: "countryDe",
        AT: "countryAt",
        CH: "countryCh"
    };

    var oPaymentTypeKeys = {
        CARD: "paymentCard",
        SEPA: "paymentSepa",
        PAYPAL: "paymentPaypal"
    };

    return Controller.extend("my.ui5.app.controller.BaseController", {

        /**
         * Liefert den Router der App
         * @returns {sap.ui.core.routing.Router}
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Liefert ein Modell nach Namen
         * @param {string} sName
         * @returns {sap.ui.model.Model}
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Setzt ein Modell auf die View
         * @param {sap.ui.model.Model} oModel
         * @param {string} sName
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Liefert das i18n-Bundle der App
         * @returns {module:sap/base/i18n/ResourceBundle}
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        /**
         * Übersetzt das gespeicherte Länderkürzel in den Anzeigenamen. Steht hier statt in
         * model/formatter.js, weil ein Modell-Modul keinen Zugriff aufs Text-Bundle hat
         * @param {string} sCountry DE, AT oder CH
         * @returns {string}
         */
        formatCountry: function (sCountry) {
            var sTextKey = oCountryKeys[sCountry];
            return sTextKey ? this.getResourceBundle().getText(sTextKey) : "";
        },

        /**
         * Übersetzt die gespeicherte Zahlungsart in den Anzeigenamen
         * @param {string} sType CARD, SEPA oder PAYPAL
         * @returns {string}
         */
        formatPaymentType: function (sType) {
            var sTextKey = oPaymentTypeKeys[sType];
            return sTextKey ? this.getResourceBundle().getText(sTextKey) : "";
        },

        /**
         * Adresse als eine Zeile für Kasse und Bestätigung; ist nichts hinterlegt,
         * steht dort die Aufforderung, sie zu ergänzen
         * @param {string} sStreet
         * @param {string} sPostalCode
         * @param {string} sCity
         * @param {string} sCountry Länderkürzel
         * @returns {string}
         */
        formatAddressLine: function (sStreet, sPostalCode, sCity, sCountry) {
            if (!sStreet && !sCity && !sPostalCode) {
                return this.getResourceBundle().getText("checkoutAddressMissing");
            }

            var sPlace = [sPostalCode, sCity].filter(Boolean).join(" ");
            return [sStreet, sPlace, this.formatCountry(sCountry)].filter(Boolean).join(", ");
        },

        /**
         * Löst einen i18n-Schlüssel aus den Mockdaten auf, etwa den Namen
         * einer Versandart aus Shipping.json
         * @param {string} sTextKey
         * @returns {string}
         */
        formatTextKey: function (sTextKey) {
            return sTextKey ? this.getResourceBundle().getText(sTextKey) : "";
        },

        /**
         * Lieferdatum einer Versandart als fertiger Satz
         * @param {int} iDays Lieferdauer
         * @returns {string}
         */
        formatShippingDelivery: function (iDays) {
            return this.getResourceBundle().getText("shippingDeliveryUntil", [formatter.formatDeliveryDate(iDays)]);
        },

        /**
         * Zeigt eine kurze Rückmeldung aus dem i18n-Bundle und spart damit das
         * ständige MessageToast.show(getResourceBundle().getText(...))
         * @param {string} sKey i18n-Schlüssel
         * @param {string[]} [aParams] Platzhalterwerte des Textes
         */
        showMessage: function (sKey, aParams) {
            MessageToast.show(this.getResourceBundle().getText(sKey, aParams));
        },

        /**
         * Markiert ein Eingabefeld als fehlerhaft oder als in Ordnung. Aus dem
         * i18n-Schlüssel des validators wird hier die sichtbare Rückmeldung am Control
         * @param {string} sControlId Id des Feldes in der View
         * @param {string} sMessageKey i18n-Schlüssel der Fehlermeldung, "" wenn der Wert gültig ist
         * @returns {boolean} true, wenn der Wert gültig ist
         */
        setFieldState: function (sControlId, sMessageKey) {
            var oControl = this.byId(sControlId);

            if (sMessageKey) {
                oControl.setValueState("Error");
                oControl.setValueStateText(this.getResourceBundle().getText(sMessageKey));
                return false;
            }

            oControl.setValueState("None");
            oControl.setValueStateText("");
            return true;
        },

        /**
         * Prüft Format und Eindeutigkeit einer E-Mail-Adresse. Die Eindeutigkeit kann
         * model/validator.js nicht prüfen, weil es die vorhandenen Konten nicht kennt
         * @param {string} sEmail eingegebene Adresse
         * @param {string} [sOwnEmail] eigene Adresse; sie gilt nicht als vergeben, sonst
         *        ließe sich im Profil die bisherige Adresse nicht bestätigen
         * @returns {string} i18n-Schlüssel oder ""
         */
        checkEmailAvailable: function (sEmail, sOwnEmail) {
            var sMessageKey = validator.checkEmail(sEmail);
            if (sMessageKey) {
                return sMessageKey;
            }

            var sSearchedEmail = sEmail.trim().toLowerCase();
            if (sOwnEmail && sOwnEmail.toLowerCase() === sSearchedEmail) {
                return "";
            }

            var bTaken = this.getModel("user").getProperty("/Users").some(function (oKandidat) {
                return oKandidat.Email.toLowerCase() === sSearchedEmail;
            });
            return bTaken ? "validationEmailExists" : "";
        },

        /**
         * Nimmt die rote Markierung weg, sobald der Nutzer das Feld korrigiert. Geprüft
         * wird erst beim Absenden - beim Tippen wäre jede halbe Eingabe kurz "falsch"
         * @param {sap.ui.base.Event} oEvent
         */
        onInputLiveChange: function (oEvent) {
            oEvent.getSource().setValueState("None");
        },

        /**
         * Legt ein Produkt in den Warenkorb und meldet das kurz zurück. Die Warenkorb-
         * Methoden stehen hier, weil Übersicht, Kopfzeile und Kasse sie alle brauchen
         * @param {object} oProduct Datensatz aus Products.json
         */
        addToCart: function (oProduct) {
            this._applyCartItems(cart.addItem(this.getCartItems(), oProduct));
            this.showMessage("cartItemAdded", [oProduct.Name]);
        },

        /**
         * Ändert die Menge einer Position
         * @param {string} sProductId Kennung des Produkts
         * @param {int} iQuantity gewünschte Menge
         */
        setCartQuantity: function (sProductId, iQuantity) {
            this._applyCartItems(cart.setQuantity(this.getCartItems(), sProductId, iQuantity));
        },

        /**
         * Nimmt eine Position aus dem Warenkorb und meldet das kurz zurück. Gesucht wird
         * vorher, weil die Meldung den Produktnamen nennt
         * @param {string} sProductId Kennung des Produkts
         */
        removeFromCart: function (sProductId) {
            var aItems = this.getCartItems();
            var oItem = aItems.find(function (oKandidat) {
                return oKandidat.ProductId === sProductId;
            });

            this._applyCartItems(cart.removeItem(aItems, sProductId));

            if (oItem) {
                this.showMessage("cartItemRemoved", [oItem.Name]);
            }
        },

        /**
         * Liefert die Positionen des Warenkorbs. Geholt wird das Modell von der Component,
         * weil die rootView deren Modelle in ihrem onInit noch nicht geerbt hat
         * @returns {object[]}
         */
        getCartItems: function () {
            return this.getCartModel().getProperty("/Items");
        },

        /**
         * Liefert das app-weite Warenkorb-Modell
         * @returns {sap.ui.model.json.JSONModel}
         */
        getCartModel: function () {
            return this.getOwnerComponent().getModel("cart");
        },

        /**
         * Liefert das app-weite Merkliste-Modell
         * @returns {sap.ui.model.json.JSONModel}
         */
        getWishlistModel: function () {
            return this.getOwnerComponent().getModel("wishlist");
        },

        /**
         * Liefert die gemerkten Produkte
         * @returns {object[]}
         */
        getWishlistItems: function () {
            return this.getWishlistModel().getProperty("/Items");
        },

        /**
         * Übernimmt geänderte Positionen ins Modell und in den Browser-Speicher - beides
         * zusammen, weil ein Warenkorb nur im Modell den nächsten Reload nicht überlebt
         * @param {object[]} aItems neue Positionen
         */
        _applyCartItems: function (aItems) {
            this.getCartModel().setProperty("/Items", aItems);
            cart.saveItems(aItems);
        },

        /**
         * Übernimmt die Merkliste ins Modell und in den Browser-Speicher
         * @param {object[]} aItems neue Merkliste
         */
        _applyWishlistItems: function (aItems) {
            this.getWishlistModel().setProperty("/Items", aItems);
            wishlist.saveItems(aItems);
        },

        /**
         * Merkt ein Produkt oder nimmt es wieder aus der Merkliste
         * @param {object} oProduct Produktdaten
         */
        toggleWishlistItem: function (oProduct) {
            var aItems = this.getWishlistItems();
            var iIndex = aItems.findIndex(function (oItem) {
                return oItem.ProductId === oProduct.ProductId;
            });

            if (iIndex !== -1) {
                this._applyWishlistItems(wishlist.removeItem(aItems, oProduct.ProductId));
                return;
            }

            this._applyWishlistItems(wishlist.addItem(aItems, oProduct));
        },

        /**
         * Verweise in der Fußzeile (AGB, Impressum, Datenschutz ...). Die Seiten gibt es
         * noch nicht, deshalb eine kurze Rückmeldung statt eines Klicks ins Leere
         */
        onFooterLinkPress: function () {
            this.showMessage("footerLinkNotAvailable");
        },

        /**
         * Navigiert zur Newsletter-Seite. Steht zentral hier, weil die Fußzeile
         * auf mehreren Seiten eingebunden ist
         */
        onNavToNewsletter: function () {
            this.getRouter().navTo("newsletter");
        },

        /**
         * Mischt bis zu 3 Empfehlungen ins "recommendations"-Modell. Übersicht und
         * Detailseite teilen sich den Block, daher der optionale Ausschluss
         * @param {object[]} aAllProducts kompletter Produktkatalog
         * @param {string[]} [aExcludeProductIds] ProductIds, die nie erscheinen sollen
         */
        loadRecommendations: function (aAllProducts, aExcludeProductIds) {
            var aExclude = aExcludeProductIds || [];
            var aPool = (aAllProducts || []).filter(function (oProduct) {
                return aExclude.indexOf(oProduct.ProductId) === -1;
            });

            var aShuffled = aPool.slice();
            for (var i = aShuffled.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = aShuffled[i];
                aShuffled[i] = aShuffled[j];
                aShuffled[j] = temp;
            }

            this.setModel(new JSONModel({ Items: aShuffled.slice(0, 3) }), "recommendations");
        },

        /**
         * Macht Karten klickbar, weil VBox/Panel/FlexBox kein press-Event haben. Der
         * Listener hängt am View-Root, das anders als der Container beim Filtern bleibt
         * @param {string} sCardSelector CSS-Selektor der Karte, z.B. ".productCard"
         * @param {string} sModelName Name des Bindungsmodells der Karte
         * @param {function} fnNavigate wird mit dem Datensatz der Karte aufgerufen
         */
        attachCardNavigation: function (sCardSelector, sModelName, fnNavigate) {
            var oView = this.getView();
            var sFlag = "cardNavigationAttached_" + sCardSelector;

            if (oView.data(sFlag)) {
                return;
            }
            oView.data(sFlag, true);

            // "tap" statt "click", damit Touch ohne Verzögerung reagiert
            oView.$().on("tap", sCardSelector, function (oEvent) {
                // Klicks auf Herz/Warenkorb sollen nicht zusätzlich navigieren
                if (oEvent.target.closest(".productActions")) {
                    return;
                }

                var oCard = sap.ui.getCore().byId(oEvent.currentTarget.id);
                var oContext = oCard && oCard.getBindingContext(sModelName);
                if (oContext) {
                    fnNavigate(oContext.getObject());
                }
            });
        },

        /**
         * Springt zur Detailseite eines Produkts. Die Kategorie steht mit in der Route,
         * damit die Seitenleiste dort gleich die richtige markieren kann
         * @param {object} oProduct
         */
        navigateToProductDetail: function (oProduct) {
            this.getRouter().navTo("productDetail", {
                category: oProduct.Category,
                productId: oProduct.ProductId
            });
        },

        /**
         * Führt aus der Fußzeile zurück zur Startseite
         */
        onNavBackFooter: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Führt vom Sommerangebot-Banner direkt zum Beispielprodukt
         */
        onNavToSummerOffer: function () {
            this.getRouter().navTo("productDetail", {
                category: "Schreibwaren",
                productId: "P001"
            });
        },

        /**
         * Markiert das passende Element in der Kategorie-Liste, ohne selectionChange
         * auszulösen. Übersicht und Detailseite brauchen beide diese Hervorhebung
         * @param {string} sCategoryId
         */
        _selectCategoryInList: function (sCategoryId) {
            var oList = this.byId("categoryList");
            if (!oList) {
                return;
            }

            var aItems = oList.getItems();
            var oMatch = aItems.find(function (oItem) {
                var oCtx = oItem.getBindingContext("categories");
                return oCtx && oCtx.getObject().CategoryId === sCategoryId;
            });

            if (oMatch) {
                oList.setSelectedItem(oMatch);
            } else {
                oList.removeSelections(true);
            }
        },

        /**
         * Klappt auf Mobile die Kategorie-Liste auf und zu
         */
        onToggleCategoryDropdown: function () {
            var oContent = this.byId("categoryDropdownContent");
            var oButton = this.byId("categoryToggleButton");
            var bWasOpen = oContent.hasStyleClass("dropdownOpen");

            oContent.toggleStyleClass("dropdownOpen");
            oButton.setIcon(bWasOpen ? "sap-icon://slim-arrow-down" : "sap-icon://slim-arrow-up");

            if (this._closeFilterDropdown) {
                this._closeFilterDropdown();
            }
        },

        /**
         * Schließt das Kategorie-Dropdown, falls es gerade offen ist
         */
        _closeCategoryDropdown: function () {
            var oContent = this.byId("categoryDropdownContent");
            var oButton = this.byId("categoryToggleButton");
            if (oContent && oContent.hasStyleClass("dropdownOpen")) {
                oContent.removeStyleClass("dropdownOpen");
                oButton.setIcon("sap-icon://slim-arrow-down");
            }
        }
    });
});