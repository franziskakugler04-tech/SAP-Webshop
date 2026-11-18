sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/validator",
    "../model/userStorage",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (BaseController, models, validator, userStorage, Fragment, MessageToast) {
    "use strict";

    /*
     * Benutzerprofil: Daten anzeigen, zeilenweise ändern, abmelden. Bearbeitet wird nur
     * eine Zeile (/EditField), der Wert steht bis zum Speichern in /Value
     */

    // Zu jedem änderbaren Feld sein Eingabefeld und seine Prüfregel; der Schlüssel ist
    // zugleich der Pfad unterhalb von /CurrentUser. Ohne "check" bleibt ein Feld ungeprüft
    var oEditableFields = {
        FirstName: { inputId: "profileFirstNameInput", check: validator.checkRequired },
        LastName: { inputId: "profileLastNameInput", check: validator.checkRequired },
        Email: { inputId: "profileEmailInput" },
        Phone: { inputId: "profilePhoneInput", check: validator.checkPhone },
        "Address/Country": { inputId: "profileCountrySelect", valuePath: "/CountryValue" },
        "Address/City": { inputId: "profileCityInput", check: validator.checkRequired },
        "Address/PostalCode": { inputId: "profilePostalCodeInput" },
        "Address/Street": { inputId: "profileStreetInput", check: validator.checkRequired },
        "Address/CompanyName": { inputId: "profileCompanyInput" },
        // "noValueState": Der SegmentedButton kennt keine Fehlermarkierung und
        // braucht auch keine - aus drei festen Segmenten wählt man nichts Falsches
        "Payment/Type": {
            inputId: "profilePaymentTypeButton",
            valuePath: "/PaymentTypeValue",
            noValueState: true
        },
        "Payment/AccountHolder": { inputId: "profileAccountHolderInput", check: validator.checkRequired },
        "Payment/Iban": { inputId: "profileIbanInput", check: validator.checkIban },
        "Payment/CardHolder": { inputId: "profileCardHolderInput", check: validator.checkRequired },
        "Payment/CardNumber": { inputId: "profileCardNumberInput", check: validator.checkCardNumber },
        "Payment/CardExpiry": { inputId: "profileCardExpiryInput", check: validator.checkCardExpiry },
        "Payment/PaypalEmail": { inputId: "profilePaypalEmailInput", check: validator.checkEmail }
    };

    // Felder des Passwort-Dialogs - für das Zurücksetzen der Markierungen
    var aPasswordFields = [
        "profilePasswordCurrentInput",
        "profilePasswordNewInput",
        "profilePasswordRepeatInput"
    ];

    return BaseController.extend("my.ui5.app.controller.Profile", {

        onInit: function () {
            this.setModel(models.createProfileModel(), "profile");
            this.getRouter().getRoute("profile").attachPatternMatched(this._onRouteMatched, this);
        },

        /**
         * Schaltet eine Zeile in den Bearbeitungsmodus. Der bisherige Wert wandert in
         * den Zwischenspeicher, damit er beim Öffnen schon im Eingabefeld steht
         * @param {string} sField Pfad unterhalb von /CurrentUser, z. B. "Address/City"
         */
        onEditField: function (sField) {
            var oProfileModel = this.getModel("profile");

            oProfileModel.setProperty("/EditField", sField);
            oProfileModel.setProperty(this._getValuePath(sField),
                this.getModel("user").getProperty("/CurrentUser/" + sField) || "");

            // Eine Meldung vom letzten Versuch wäre sonst noch zu sehen
            this._setFieldState(sField, "");

            this._focusEditField(sField);
        },

        /**
         * Prüft die Eingabe und übernimmt sie in den Benutzerdatensatz
         * @param {string} sField Pfad unterhalb von /CurrentUser, z. B. "Address/City"
         */
        onSaveField: function (sField) {
            var oUserModel = this.getModel("user");
            var sValue = (this.getModel("profile").getProperty(this._getValuePath(sField)) || "").trim();

            // Ist die Eingabe ungültig, bleibt die Zeile offen und die Meldung
            // steht direkt am Feld - der Nutzer verliert seine Eingabe nicht
            if (!this._setFieldState(sField, this._checkField(sField, sValue))) {
                return;
            }

            var sOldEmail = oUserModel.getProperty("/CurrentUser/Email");
            oUserModel.setProperty("/CurrentUser/" + sField, sValue);

            // Die Sitzung merkt sich die E-Mail-Adresse; ohne das Nachziehen
            // würde der nächste Reload abmelden
            if (sField === "Email" && sValue !== sOldEmail) {
                userStorage.setSession(sValue);
            }

            userStorage.updateUser(oUserModel.getProperty("/CurrentUser"));

            this._stopEditing();
            MessageToast.show(this.getResourceBundle().getText("profileFieldSaved"));
        },

        /**
         * Verwirft die Eingabe und zeigt wieder den gespeicherten Wert an
         * @param {string} sField Pfad unterhalb von /CurrentUser, z. B. "Address/City"
         */
        onCancelEdit: function (sField) {
            this._setFieldState(sField, "");
            this._stopEditing();
        },

        /**
         * Öffnet den Dialog zum Ändern des Passworts. Das Fragment wird erst beim ersten
         * Klick geladen und hängt über addDependent an der View
         */
        onEditPassword: function () {
            var oView = this.getView();

            if (!this._pPasswordDialog) {
                this._pPasswordDialog = Fragment.load({
                    // Dieselbe Id wie die View, damit this.byId() auch die
                    // Felder im Fragment findet - setFieldState braucht das
                    id: oView.getId(),
                    name: "my.ui5.app.fragment.PasswordDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pPasswordDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        /**
         * Prüft die drei Eingaben und übernimmt das neue Passwort
         */
        onSavePassword: function () {
            var oUserModel = this.getModel("user");
            var oPassword = this.getModel("profile").getProperty("/Password");

            // Alle drei Felder werden geprüft, bevor abgebrochen wird
            var aResults = [
                this.setFieldState("profilePasswordCurrentInput", this._checkCurrentPassword(oPassword.Current)),
                this.setFieldState("profilePasswordNewInput", validator.checkPassword(oPassword.New)),
                this.setFieldState("profilePasswordRepeatInput",
                    validator.checkPasswordRepeat(oPassword.New, oPassword.Repeat))
            ];

            if (aResults.indexOf(false) !== -1) {
                return;
            }

            oUserModel.setProperty("/CurrentUser/Password", oPassword.New);
            userStorage.updateUser(oUserModel.getProperty("/CurrentUser"));

            this.byId("profilePasswordDialog").close();
            MessageToast.show(this.getResourceBundle().getText("profilePasswordChanged"));
        },

        /**
         * Schließt den Dialog, ohne das Passwort zu ändern
         */
        onCancelPassword: function () {
            this.byId("profilePasswordDialog").close();
        },

        /**
         * Leert die Eingaben nach dem Schließen des Dialogs
         */
        onPasswordDialogClose: function () {
            this.getModel("profile").setProperty("/Password", {
                Current: "",
                New: "",
                Repeat: ""
            });

            aPasswordFields.forEach(function (sFieldId) {
                this.setFieldState(sFieldId, "");
            }, this);
        },

        /**
         * Meldet den Benutzer ab und kehrt zur Startseite zurück
         */
        onLogout: function () {
            var oUserModel = this.getModel("user");

            oUserModel.setProperty("/CurrentUser", null);
            oUserModel.setProperty("/LoggedIn", false);
            userStorage.setSession(null);

            MessageToast.show(this.getResourceBundle().getText("profileLogoutSuccess"));
            this.getRouter().navTo("main");
        },

        /**
         * Zurück zur Startseite über den Pfeil in der Kopfzeile
         */
        onNavBack: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Zeigt einen Ersatztext an, wenn ein freiwilliges Feld leer geblieben ist
         * @param {string} sValue
         * @returns {string}
         */
        formatOptional: function (sValue) {
            return sValue ? sValue : this.getResourceBundle().getText("profileNotProvided");
        },

        /**
         * Liefert den Pfad des Zwischenspeichers zum Feld. Alle Zeilen teilen sich
         * /Value; die Auswahllisten brauchen einen eigenen, sonst überschreiben sie ihn
         * @param {string} sField Pfad des Feldes unterhalb von /CurrentUser
         * @returns {string} Pfad im Modell "profile"
         */
        _getValuePath: function (sField) {
            return oEditableFields[sField].valuePath || "/Value";
        },

        /**
         * Markiert das Eingabefeld der Zeile, sofern es eine Markierung kennt
         * @param {string} sField Pfad des Feldes unterhalb von /CurrentUser
         * @param {string} sMessageKey i18n-Schlüssel der Meldung, "" wenn gültig
         * @returns {boolean} true, wenn der Wert gültig ist
         */
        _setFieldState: function (sField, sMessageKey) {
            var oField = oEditableFields[sField];
            return oField.noValueState ? true : this.setFieldState(oField.inputId, sMessageKey);
        },

        /**
         * Setzt den Schreibcursor in das gerade geöffnete Feld
         * @param {string} sField Pfad des Feldes unterhalb von /CurrentUser
         */
        _focusEditField: function (sField) {
            var oControl = this.byId(oEditableFields[sField].inputId);
            if (!oControl) {
                return;
            }

            var oDelegate = {
                onAfterRendering: function () {
                    oControl.removeEventDelegate(oDelegate);
                    oControl.focus();
                }
            };
            oControl.addEventDelegate(oDelegate);
        },

        /**
         * Wählt die Prüfregel zum Feld. E-Mail-Adresse und Postleitzahl sind Sonderfälle:
         * die eine darf keinem anderen Konto gehören, die andere hängt am Land
         * @param {string} sField Pfad unterhalb von /CurrentUser, z. B. "Address/City"
         * @param {string} sValue eingegebener Wert
         * @returns {string} i18n-Schlüssel oder ""
         */
        _checkField: function (sField, sValue) {
            var oUserModel = this.getModel("user");

            if (sField === "Email") {
                return this.checkEmailAvailable(sValue, oUserModel.getProperty("/CurrentUser/Email"));
            }

            if (sField === "Address/PostalCode") {
                return validator.checkPostalCode(sValue, oUserModel.getProperty("/CurrentUser/Address/Country"));
            }

            var fnCheck = oEditableFields[sField].check;
            return fnCheck ? fnCheck(sValue) : "";
        },

        /**
         * Prüft, ob das eingegebene bisherige Passwort stimmt
         * @param {string} sValue eingegebenes bisheriges Passwort
         * @returns {string} i18n-Schlüssel oder ""
         */
        _checkCurrentPassword: function (sValue) {
            var sMessageKey = validator.checkRequired(sValue);
            if (sMessageKey) {
                return sMessageKey;
            }

            var sStoredPassword = this.getModel("user").getProperty("/CurrentUser/Password");
            return sValue === sStoredPassword ? "" : "profilePasswordWrong";
        },

        /**
         * Beendet die Bearbeitung: alle Zeilen zeigen wieder ihren Wert an
         */
        _stopEditing: function () {
            var oProfileModel = this.getModel("profile");

            oProfileModel.setProperty("/EditField", "");
            oProfileModel.setProperty("/Value", "");
        },

        /**
         * Wer nicht angemeldet ist, hat auf der Profilseite nichts zu suchen - über die
         * Adresszeile ginge es sonst. pReady, weil die Sitzung noch nicht wiederhergestellt ist
         */
        _onRouteMatched: function () {
            var oUserModel = this.getModel("user");

            // Der Router verwendet dieselbe View wieder; ohne Zurücksetzen stünde
            // beim zweiten Besuch noch die alte Zeile offen
            this._stopEditing();

            oUserModel.pReady.then(function () {
                if (!oUserModel.getProperty("/LoggedIn")) {
                    // replace, damit der Zurück-Pfeil nicht wieder hierher führt
                    this.getRouter().navTo("login", {}, true);
                }
            }.bind(this));
        }
    });
});
