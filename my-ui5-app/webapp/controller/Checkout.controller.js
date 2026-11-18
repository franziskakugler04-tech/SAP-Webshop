sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/formatter",
    "../model/validator",
    "../model/cart",
    "sap/m/MessageBox"
], function (BaseController, models, formatter, validator, cart, MessageBox) {
    "use strict";

    /*
     * Kasse: Lieferadresse, Zahlungsart, Versandart und Positionen. Bearbeitet wird
     * höchstens eine Karte (/EditSection), denn eine Adresse ändert man als Block
     */

    // Pflichtfelder der Lieferadresse; der Firmenname bleibt freiwillig, die
    // Postleitzahl steht als Sonderfall in _checkPostalCode (Ziffern je Land)
    var aAddressFields = [
        { id: "checkoutStreetInput", property: "Street", check: validator.checkRequired },
        { id: "checkoutCityInput", property: "City", check: validator.checkRequired },
        { id: "checkoutPostalCodeInput", property: "PostalCode" }
    ];

    // Zu jeder Zahlungsart ihre Felder - wie in Register.controller.js, hier mit
    // den Ids der Kasse. Die Prüfziffer bestätigt nur diese eine Zahlung
    var oPaymentFields = {
        CARD: [
            { id: "checkoutCardHolderInput", property: "CardHolder", check: validator.checkRequired },
            { id: "checkoutCardNumberInput", property: "CardNumber", check: validator.checkCardNumber },
            { id: "checkoutCardExpiryInput", property: "CardExpiry", check: validator.checkCardExpiry },
            { id: "checkoutCardCvcInput", property: "CardCvc", check: validator.checkCardCvc }
        ],
        SEPA: [
            { id: "checkoutAccountHolderInput", property: "AccountHolder", check: validator.checkRequired },
            { id: "checkoutIbanInput", property: "Iban", check: validator.checkIban }
        ],
        PAYPAL: [
            { id: "checkoutPaypalEmailInput", property: "PaypalEmail", check: validator.checkEmail }
        ]
    };

    /**
     * Rundet einen Betrag auf Cent
     * @param {float} fValue
     * @returns {float}
     */
    function round(fValue) {
        return Math.round(fValue * 100) / 100;
    }

    return BaseController.extend("my.ui5.app.controller.Checkout", {

        formatter: formatter,

        onInit: function () {
            this.getRouter().getRoute("checkout").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Schaltet eine Karte in den Bearbeitungsmodus. Der bisherige Stand wird
         * gesichert, weil die Felder direkt ins Modell schreiben
         * @param {string} sSection "Address" oder "Payment"
         */
        onEditSection: function (sSection) {
            var oCheckoutModel = this.getModel("checkout");

            this._oBackup = JSON.parse(JSON.stringify(oCheckoutModel.getProperty("/" + sSection)));
            oCheckoutModel.setProperty("/EditSection", sSection);
            this._clearFieldStates(sSection);
        },

        /**
         * Prüft die Eingaben der Karte und klappt sie bei Erfolg wieder zu
         * @param {string} sSection "Address" oder "Payment"
         */
        onApplySection: function (sSection) {
            if (!this._validateSection(sSection)) {
                return;
            }

            this.getModel("checkout").setProperty("/EditSection", "");
            this.showMessage("checkoutSectionApplied");

            // Fehlt in der anderen Karte noch etwas, führt es gleich dorthin weiter
            this._openMissingSection();
        },

        /**
         * Stellt den gesicherten Stand wieder her und klappt die Karte zu
         * @param {string} sSection "Address" oder "Payment"
         */
        onCancelSection: function (sSection) {
            var oCheckoutModel = this.getModel("checkout");

            oCheckoutModel.setProperty("/" + sSection, this._oBackup);
            oCheckoutModel.setProperty("/EditSection", "");
            this._clearFieldStates(sSection);
        },

        /**
         * Räumt beim Wechsel der Zahlungsart die Markierungen der vorher
         * sichtbaren Felder weg
         */
        onPaymentTypeChange: function () {
            this._clearFieldStates("Payment");
        },

        /**
         * Räumt beim Wechsel des Landes die PLZ-Meldung weg, weil dann eine
         * andere Regel gilt
         */
        onCountryChange: function () {
            this.setFieldState("checkoutPostalCodeInput", "");
        },

        /**
         * Übernimmt die in der Liste gewählte Versandart
         * @param {sap.ui.base.Event} oEvent
         */
        onShippingSelect: function (oEvent) {
            var oOption = oEvent.getParameter("listItem").getBindingContext("shipping").getObject();
            this.getModel("checkout").setProperty("/ShippingId", oOption.ShippingId);
            this._refreshTotals();
        },

        /**
         * Übernimmt eine geänderte Menge. Der Weg über setCartQuantity begrenzt sie
         * auf den Lagerbestand und sichert sie - das Eingabefeld allein täte das nicht
         * @param {sap.ui.base.Event} oEvent
         */
        onQuantityChange: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("cart").getObject();

            this.setCartQuantity(oItem.ProductId, oEvent.getParameter("value"));
            this._refreshTotals();
        },

        /**
         * Entfernt eine Position über den Löschen-Knopf der Liste. War es die letzte,
         * ist die Kasse sinnlos und es geht zurück in den Shop
         * @param {sap.ui.base.Event} oEvent
         */
        onCartItemDelete: function (oEvent) {
            var oItem = oEvent.getParameter("listItem").getBindingContext("cart").getObject();

            this.removeFromCart(oItem.ProductId);

            if (!this.getCartItems().length) {
                this.getRouter().navTo("products", {}, true);
                return;
            }
            this._refreshTotals();
        },

        /**
         * Prüft den eingegebenen Gutscheincode und rechnet ihn an
         */
        onApplyCoupon: function () {
            var oCheckoutModel = this.getModel("checkout");
            var sCode = (oCheckoutModel.getProperty("/CouponCode") || "").trim().toUpperCase();

            if (!sCode) {
                this.setFieldState("checkoutCouponInput", "validationRequired");
                return;
            }

            var oCoupon = this.getModel("coupons").getProperty("/Coupons").find(function (oKandidat) {
                return oKandidat.Code === sCode;
            });

            if (!oCoupon) {
                this.setFieldState("checkoutCouponInput", "checkoutCouponInvalid");
                return;
            }

            this.setFieldState("checkoutCouponInput", "");
            oCheckoutModel.setProperty("/AppliedCoupon", oCoupon);
            this._refreshTotals();
            this.showMessage("checkoutCouponApplied", [String(oCoupon.Percent)]);
        },

        /**
         * Nimmt einen eingelösten Gutschein wieder zurück
         */
        onRemoveCoupon: function () {
            var oCheckoutModel = this.getModel("checkout");

            oCheckoutModel.setProperty("/AppliedCoupon", null);
            oCheckoutModel.setProperty("/CouponCode", "");
            this.setFieldState("checkoutCouponInput", "");
            this._refreshTotals();
        },

        /**
         * Schickt die Bestellung ab. Geprüft wird immer beides, damit alle Fehler auf
         * einen Blick sichtbar sind; die Sammelmeldung erreicht auch zugeklappte Karten
         */
        onPlaceOrder: function () {
            var bAddressOk = this._validateSection("Address");
            var bPaymentOk = this._validateSection("Payment");

            if (!bAddressOk || !bPaymentOk) {
                // Die erste fehlerhafte Karte aufklappen, damit man die Markierungen sieht
                this.getModel("checkout").setProperty("/EditSection", bAddressOk ? "Payment" : "Address");
                MessageBox.error(this.getResourceBundle().getText("checkoutFormInvalid"));
                return;
            }

            var oOrder = this._buildOrder();

            cart.saveLastOrder(oOrder);
            cart.clearItems();
            this.getCartModel().setProperty("/Items", []);

            // replace, damit der Zurück-Pfeil nicht in die geleerte Kasse führt
            this.getRouter().navTo("orderConfirmation", {}, true);
        },

        /**
         * Zurück in den Shop, ohne zu bestellen
         */
        onNavBack: function () {
            this.getRouter().navTo("products");
        },

        /**
         * Überschrift der Adresskarte: "Lieferung an Max Mustermann, OTH Amberg"
         * @param {string} sFirstName
         * @param {string} sLastName
         * @param {string} sCompany freiwillig
         * @returns {string}
         */
        formatAddressTitle: function (sFirstName, sLastName, sCompany) {
            var sName = [sFirstName, sLastName].filter(Boolean).join(" ");
            var sText = [sName, sCompany].filter(Boolean).join(", ");
            return this.getResourceBundle().getText("checkoutAddressTitle", [sText]);
        },

        /**
         * Überschrift der Zahlungskarte: "Bezahlen mit Kreditkarte"
         * @param {string} sType CARD, SEPA oder PAYPAL
         * @returns {string}
         */
        formatPaymentTitle: function (sType) {
            return this.getResourceBundle().getText("checkoutPaymentTitle", [this.formatPaymentType(sType)]);
        },

        /**
         * Zweite Zeile der Zahlungskarte, je nach Zahlungsart. Kartennummer und IBAN
         * nur mit den letzten vier Zeichen - vollständig gehören sie nicht hierher
         * @param {string} sType CARD, SEPA oder PAYPAL
         * @param {string} sCardHolder
         * @param {string} sCardNumber
         * @param {string} sAccountHolder
         * @param {string} sIban
         * @param {string} sPaypalEmail
         * @returns {string}
         */
        formatPaymentLine: function (sType, sCardHolder, sCardNumber, sAccountHolder, sIban, sPaypalEmail) {
            var aParts;

            if (sType === "CARD") {
                aParts = [sCardHolder, this._maskValue(sCardNumber)];
            } else if (sType === "SEPA") {
                aParts = [sAccountHolder, this._maskValue(sIban)];
            } else {
                aParts = [sPaypalEmail];
            }

            aParts = aParts.filter(Boolean);
            return aParts.length
                ? aParts.join(", ")
                : this.getResourceBundle().getText("checkoutPaymentMissing");
        },

        /**
         * Stückpreis unter dem Produktnamen
         * @param {float} fPrice
         * @returns {string}
         */
        formatUnitPrice: function (fPrice) {
            return this.getResourceBundle().getText("checkoutUnitPrice", [formatter.formatPrice(fPrice)]);
        },

        /**
         * Rabattzeile - der Betrag wird abgezogen und deshalb mit Minus gezeigt
         * @param {float} fDiscount
         * @returns {string}
         */
        formatDiscount: function (fDiscount) {
            return "− " + formatter.formatPrice(fDiscount);
        },

        /**
         * Hinweis auf den eingelösten Gutschein
         * @param {object} oCoupon eingelöster Gutschein oder null
         * @returns {string}
         */
        formatCouponInfo: function (oCoupon) {
            return oCoupon
                ? this.getResourceBundle().getText("checkoutCouponActive", [oCoupon.Code, String(oCoupon.Percent)])
                : "";
        },

        /**
         * Rechnet alle Beträge neu und schreibt sie nach /Totals - nach jeder Änderung
         * an Menge, Position, Versandart oder Gutschein
         */
        _refreshTotals: function () {
            var oCheckoutModel = this.getModel("checkout");
            var oCoupon = oCheckoutModel.getProperty("/AppliedCoupon");

            var fSubtotal = round(cart.getSubtotal(this.getCartItems()));
            // Vor dem Weiterrechnen auf Cent runden, sonst gehen Rabattzeile
            // und Gesamtsumme optisch nicht auf
            var fDiscount = oCoupon ? round(fSubtotal * oCoupon.Percent / 100) : 0;
            var fShipping = this._getShippingPrice();

            oCheckoutModel.setProperty("/Totals", {
                Subtotal: fSubtotal,
                Discount: fDiscount,
                Shipping: fShipping,
                Total: round(fSubtotal - fDiscount + fShipping)
            });
        },

        /**
         * Stellt den Datensatz der Bestellung zusammen. Die Prüfziffer bleibt bewusst
         * draußen - sie bestätigt eine einzelne Zahlung und gehört in keinen Beleg
         * @returns {object}
         */
        _buildOrder: function () {
            var oCheckoutModel = this.getModel("checkout");
            var oPayment = oCheckoutModel.getProperty("/Payment");
            var oOption = this._getShippingOption();

            return {
                // Letzte acht Stellen des Zeitstempels; eine echte Bestellnummer
                // vergäbe der Server, ohne Backend reicht ein eindeutiger Wert
                OrderNumber: String(Date.now()).slice(-8),
                OrderDate: new Date().toISOString(),
                Email: this.getModel("user").getProperty("/CurrentUser/Email"),
                Items: this.getCartItems(),
                Totals: oCheckoutModel.getProperty("/Totals"),
                Address: oCheckoutModel.getProperty("/Address"),
                Payment: {
                    Type: oPayment.Type,
                    AccountHolder: oPayment.AccountHolder,
                    Iban: oPayment.Iban,
                    CardHolder: oPayment.CardHolder,
                    CardNumber: oPayment.CardNumber,
                    CardExpiry: oPayment.CardExpiry,
                    PaypalEmail: oPayment.PaypalEmail
                },
                ShippingId: oCheckoutModel.getProperty("/ShippingId"),
                ShippingNameKey: oOption ? oOption.NameKey : "",
                DeliveryDays: oOption ? oOption.DeliveryDays : 0
            };
        },

        /**
         * Die gewählte Versandart
         * @returns {object|undefined}
         */
        _getShippingOption: function () {
            var aOptions = this.getModel("shipping").getProperty("/ShippingOptions") || [];
            var sShippingId = this.getModel("checkout").getProperty("/ShippingId");

            return aOptions.find(function (oKandidat) {
                return oKandidat.ShippingId === sShippingId;
            });
        },

        /**
         * Preis der gewählten Versandart
         * @returns {float} 0, solange die Versandarten noch nicht geladen sind
         */
        _getShippingPrice: function () {
            var oOption = this._getShippingOption();
            return oOption ? oOption.Price : 0;
        },

        /**
         * Zeigt von einer Karten- oder Kontonummer nur die letzten vier Zeichen
         * @param {string} sValue
         * @returns {string}
         */
        _maskValue: function (sValue) {
            var sTrimmed = (sValue || "").replace(/\s/g, "");
            return sTrimmed ? "•••• " + sTrimmed.slice(-4) : "";
        },

        /**
         * Prüft die Eingaben einer Karte und markiert fehlerhafte Felder
         * @param {string} sSection "Address" oder "Payment"
         * @returns {boolean} true, wenn alle Angaben stimmen
         */
        _validateSection: function (sSection) {
            var aResults = this._getFields(sSection).map(function (oField) {
                var sValue = this.getModel("checkout").getProperty("/" + sSection + "/" + oField.property);
                var sMessageKey = oField.check
                    ? oField.check(sValue)
                    : this._checkPostalCode(sValue);
                return this.setFieldState(oField.id, sMessageKey);
            }, this);

            return aResults.indexOf(false) === -1;
        },

        /**
         * Die Postleitzahl braucht das gewählte Land als zweite Angabe
         * @param {string} sValue
         * @returns {string} i18n-Schlüssel oder ""
         */
        _checkPostalCode: function (sValue) {
            return validator.checkPostalCode(sValue, this.getModel("checkout").getProperty("/Address/Country"));
        },

        /**
         * Liefert die zu prüfenden Felder einer Karte; bei der Zahlung nur die
         * der gerade gewählten Art
         * @param {string} sSection "Address" oder "Payment"
         * @returns {object[]}
         */
        _getFields: function (sSection) {
            if (sSection === "Address") {
                return aAddressFields;
            }
            return oPaymentFields[this.getModel("checkout").getProperty("/Payment/Type")];
        },

        /**
         * Entfernt die Fehlermarkierungen einer Karte; bei der Zahlung alle Arten,
         * nicht nur die sichtbare
         * @param {string} sSection "Address" oder "Payment"
         */
        _clearFieldStates: function (sSection) {
            if (sSection === "Address") {
                aAddressFields.forEach(function (oField) {
                    this.setFieldState(oField.id, "");
                }, this);
                return;
            }

            Object.keys(oPaymentFields).forEach(function (sType) {
                oPaymentFields[sType].forEach(function (oField) {
                    this.setFieldState(oField.id, "");
                }, this);
            }, this);
        },

        /**
         * Zur Kasse kommt nur, wer angemeldet ist und etwas im Warenkorb hat - beides
         * ließe sich über die Adresszeile umgehen. pReady, weil die Sitzung noch fehlt
         */
        _onRouteMatched: function () {
            var oUserModel = this.getModel("user");

            oUserModel.pReady.then(function () {
                if (!oUserModel.getProperty("/LoggedIn")) {
                    // replace, damit der Zurück-Pfeil nicht wieder hierher führt
                    this.getRouter().navTo("login", {}, true);
                    return;
                }

                if (!this.getCartItems().length) {
                    this.showMessage("checkoutEmptyCart");
                    this.getRouter().navTo("products", {}, true);
                    return;
                }

                this._prepareCheckout(oUserModel.getProperty("/CurrentUser"));
            }.bind(this));
        },

        /**
         * Baut die Modelle der Seite neu auf, sonst stünden beim zweiten Besuch
         * noch die Eingaben der vorigen Bestellung in der Maske
         * @param {object} oUser angemeldeter Benutzer
         */
        _prepareCheckout: function (oUser) {
            var oShippingModel = models.createShippingModel();

            this.setModel(models.createCheckoutModel(oUser), "checkout");
            this.setModel(oShippingModel, "shipping");
            this.setModel(models.createCouponsModel(), "coupons");

            this._openMissingSection();

            // Die Versandkosten stehen erst fest, wenn die Mockdaten da sind
            oShippingModel.dataLoaded().then(this._refreshTotals.bind(this));
        },

        /**
         * Öffnet die erste Karte, in der noch etwas fehlt. Bei Kreditkarte ist das
         * immer die Zahlung, weil die Prüfziffer nie gespeichert wird
         */
        _openMissingSection: function () {
            var oCheckoutModel = this.getModel("checkout");
            var oAddress = oCheckoutModel.getProperty("/Address");

            if (!oAddress.Street || !oAddress.City || !oAddress.PostalCode) {
                this.onEditSection("Address");
                return;
            }

            var bPaymentComplete = this._getFields("Payment").every(function (oField) {
                return oCheckoutModel.getProperty("/Payment/" + oField.property);
            });

            if (!bPaymentComplete) {
                this.onEditSection("Payment");
            }
        }
    });
});
