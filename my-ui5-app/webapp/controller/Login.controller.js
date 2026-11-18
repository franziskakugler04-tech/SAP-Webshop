sap.ui.define([
    "./BaseController",
    "../model/validator",
    "../model/userStorage",
    "sap/m/MessageToast"
], function (BaseController, validator, userStorage, MessageToast) {
    "use strict";

    /*
     * Anmeldeseite. Die zwei Eingabefelder werden direkt über ihre Id ausgelesen; ein
     * eigenes Modell wäre hier mehr Aufwand als Nutzen (anders in Register.controller.js)
     */
    return BaseController.extend("my.ui5.app.controller.Login", {

        /**
         * Setzt das Formular bei jedem Aufruf der Route zurück
         */
        onInit: function () {
            // Der Router verwendet dieselbe View wieder; ohne Zurücksetzen stünden
            // beim zweiten Besuch noch die alten Eingaben in der Maske
            this.getRouter().getRoute("login").attachPatternMatched(this._resetForm, this);
        },

        /**
         * Meldet den Benutzer an, wenn E-Mail und Passwort zu einem Konto passen
         */
        onLogin: function () {
            var oUserModel = this.getModel("user");
            var sEmail = this.byId("loginEmailInput").getValue();
            var sPassword = this.byId("loginPasswordInput").getValue();

            this.byId("loginErrorStrip").setVisible(false);

            // Beide Felder werden geprüft, bevor abgebrochen wird. Beim Passwort reicht
            // die Pflichtfeldprüfung - ob es stimmt, entscheidet der Abgleich unten
            var bEmailOk = this.setFieldState("loginEmailInput", validator.checkEmail(sEmail));
            var bPasswordOk = this.setFieldState("loginPasswordInput", validator.checkRequired(sPassword));
            if (!bEmailOk || !bPasswordOk) {
                return;
            }

            var sSearchedEmail = sEmail.trim().toLowerCase();
            var oUser = oUserModel.getProperty("/Users").find(function (oKandidat) {
                return oKandidat.Email.toLowerCase() === sSearchedEmail && oKandidat.Password === sPassword;
            });

            if (!oUser) {
                this.byId("loginErrorStrip").setVisible(true);
                return;
            }

            oUserModel.setProperty("/CurrentUser", oUser);
            oUserModel.setProperty("/LoggedIn", true);
            // Sitzung merken, damit ein Reload nicht abmeldet
            userStorage.setSession(oUser.Email);

            MessageToast.show(this.getResourceBundle().getText("loginSuccess", [oUser.FirstName]));
            this.getRouter().navTo("main");
        },

        /**
         * Zurück zur Startseite über den Pfeil in der Kopfzeile
         */
        onNavBack: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Wechselt zur Registrierung
         */
        onNavToRegister: function () {
            this.getRouter().navTo("register");
        },

        /**
         * Leert Eingaben, Feldmarkierungen und die Sammelmeldung
         */
        _resetForm: function () {
            this.byId("loginEmailInput").setValue("");
            this.byId("loginPasswordInput").setValue("");
            this.setFieldState("loginEmailInput", "");
            this.setFieldState("loginPasswordInput", "");
            this.byId("loginErrorStrip").setVisible(false);
        }
    });
});
