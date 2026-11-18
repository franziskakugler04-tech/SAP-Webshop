sap.ui.define([
    "./BaseController",
    "../model/cart",
    "../model/formatter",
    "sap/ui/model/json/JSONModel"
], function (BaseController, cart, formatter, JSONModel) {
    "use strict";

    /*
     * Bestätigung einer abgeschickten Bestellung
     */

    return BaseController.extend("my.ui5.app.controller.OrderConfirmation", {

        formatter: formatter,

        /**
         * Reagiert auf die Route, um die Bestellung nachzuladen
         */
        onInit: function () {
            this.getRouter().getRoute("orderConfirmation").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Satz mit der Bestellnummer
         * @param {string} sOrderNumber
         * @returns {string}
         */
        formatOrderNumber: function (sOrderNumber) {
            return this.getResourceBundle().getText("orderConfirmationNumber", [sOrderNumber]);
        },

        /**
         * Hinweis auf die Bestätigungsmail mit der Adresse des Kontos
         * @param {string} sEmail
         * @returns {string}
         */
        formatMailInfo: function (sEmail) {
            return this.getResourceBundle().getText("orderConfirmationMailInfo", [sEmail]);
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
         * Öffnet den Druckdialog des Browsers. Ein echtes PDF bräuchte ein Fremd-
         * Framework; "Als PDF speichern" führt zum selben Ergebnis
         */
        onPrint: function () {
            window.print();
        },

        /**
         * Führt zum Weitereinkaufen zurück auf die Startseite
         */
        onContinue: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Holt die Bestellung aus dem Browser-Speicher statt aus einem Modell der
         * Kasse, damit sie einen Reload übersteht; ohne Bestellung geht es zurück
         */
        _onRouteMatched: function () {
            var oOrder = cart.loadLastOrder();

            if (!oOrder) {
                this.getRouter().navTo("main", {}, true);
                return;
            }

            this.setModel(new JSONModel(oOrder), "order");
        }
    });
});
