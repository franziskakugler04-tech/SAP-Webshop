sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/validator"
], function (BaseController, JSONModel, validator) {
    "use strict";

    return BaseController.extend("my.ui5.app.controller.Newsletter", {

        /**
         * Hält fest, ob die Anmeldung auf dieser Seite schon erfolgt ist
         */
        onInit: function () {
            this.setModel(new JSONModel({ subscribed: false, Email: "" }), "newsletterView");
        },

        /**
         * Meldet zum Newsletter an, sobald die E-Mail-Adresse gültig ist. Simuliert -
         * ohne Backend wird nichts verschickt, nur der Zustand umgeschaltet
         */
        onSubscribe: function () {
            var oModel = this.getModel("newsletterView");
            var sMessageKey = validator.checkEmail(oModel.getProperty("/Email"));

            if (!this.setFieldState("newsletterEmailInput", sMessageKey)) {
                return;
            }

            oModel.setProperty("/subscribed", true);
        },

        /**
         * Zurück zur Startseite über den Pfeil in der Kopfzeile
         */
        onNavBack: function () {
            this.getRouter().navTo("main");
        },
    });
});