sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/validator",
    "../model/userStorage",
    "sap/m/MessageBox"
], function (BaseController, models, validator, userStorage, MessageBox) {
    "use strict";

    /*
     * Registrierung. Alle Eingaben hängen am Modell "registration", das ist bei dieser
     * Feldanzahl übersichtlicher; die Ids bleiben für die Fehlermarkierung nötig
     */

    // Reihenfolge wie in der RadioButtonGroup der View; der ausgewählte Index
    // wird darüber in den Schlüssel übersetzt, der im Benutzerdatensatz landet
    var aSalutations = ["FRAU", "HERR", "DIVERS", "KEINE"];

    // Felder des Abschnitts "Anmeldedaten" - für Prüfung und Zurücksetzen
    var aAccountFields = [
        "registerFirstNameInput",
        "registerLastNameInput",
        "registerEmailInput",
        "registerPhoneInput",
        "registerPasswordInput",
        "registerPasswordRepeatInput"
    ];

    // Pflichtfelder des Abschnitts "Adresse", sobald dort etwas eingetragen ist;
    // der Firmenname bleibt in jedem Fall freiwillig
    var aAddressFields = [
        "registerCityInput",
        "registerPostalCodeInput",
        "registerStreetInput"
    ];

    // Zu jeder Zahlungsart ihre Felder: Id, Eigenschaft und Prüfregel. Als Tabelle
    // statt als drei fast gleiche if-Zweige, so steht die Prüflogik nur einmal da
    var oPaymentFields = {
        CARD: [
            { id: "registerCardHolderInput", property: "CardHolder", check: validator.checkRequired },
            { id: "registerCardNumberInput", property: "CardNumber", check: validator.checkCardNumber },
            { id: "registerCardExpiryInput", property: "CardExpiry", check: validator.checkCardExpiry },
            { id: "registerCardCvcInput", property: "CardCvc", check: validator.checkCardCvc }
        ],
        SEPA: [
            { id: "registerAccountHolderInput", property: "AccountHolder", check: validator.checkRequired },
            { id: "registerIbanInput", property: "Iban", check: validator.checkIban }
        ],
        PAYPAL: [
            { id: "registerPaypalEmailInput", property: "PaypalEmail", check: validator.checkEmail }
        ]
    };

    return BaseController.extend("my.ui5.app.controller.Register", {

        onInit: function () {
            this._resetForm();

            // Der Router verwendet dieselbe View wieder; ohne Zurücksetzen stünden
            // beim zweiten Besuch noch die alten Eingaben in der Maske
            this.getRouter().getRoute("register").attachPatternMatched(this._resetForm, this);
        },

        /**
         * Legt das Konto an, wenn alle Pflichtangaben stimmen, und meldet
         * den neuen Benutzer direkt an
         */
        onRegister: function () {
            // Alle Abschnitte werden geprüft, bevor abgebrochen wird - sonst fände
            // der Nutzer die Fehler nacheinander statt auf einen Schlag
            var bAccountOk = this._validateAccount();
            var bAddressOk = this._validateAddress();
            var bPaymentOk = this._validatePayment();

            if (!bAccountOk || !bAddressOk || !bPaymentOk) {
                MessageBox.error(this.getResourceBundle().getText("registerFormInvalid"));
                return;
            }

            var oUserModel = this.getModel("user");
            var oNewUser = this._buildUser();

            // Erst dauerhaft speichern, dann im Modell bekannt machen - sonst
            // fände die Anmeldung das Konto nur bis zum nächsten Reload
            userStorage.saveUser(oNewUser);
            oUserModel.setProperty("/Users", oUserModel.getProperty("/Users").concat(oNewUser));

            oUserModel.setProperty("/CurrentUser", oNewUser);
            oUserModel.setProperty("/LoggedIn", true);
            userStorage.setSession(oNewUser.Email);

            MessageBox.success(
                this.getResourceBundle().getText("registerSuccess", [oNewUser.FirstName]),
                {
                    onClose: function () {
                        this.getRouter().navTo("main");
                    }.bind(this)
                }
            );
        },

        /**
         * Zurück zur Anmeldeseite - von dort kommt man hierher, deshalb führen
         * der Pfeil in der Kopfzeile und "Abbrechen" dorthin zurück
         */
        onNavBack: function () {
            this.getRouter().navTo("login");
        },

        /**
         * Prüft den Abschnitt "Anmeldedaten"
         * @returns {boolean} true, wenn alle Pflichtangaben stimmen
         */
        _validateAccount: function () {
            var oData = this.getModel("registration").getData();

            // Alle Felder werden geprüft, bevor entschieden wird, damit der Nutzer
            // sämtliche Fehler auf einen Blick sieht
            var aResults = [
                this.setFieldState("registerFirstNameInput", validator.checkRequired(oData.FirstName)),
                this.setFieldState("registerLastNameInput", validator.checkRequired(oData.LastName)),
                this.setFieldState("registerEmailInput", this.checkEmailAvailable(oData.Email)),
                this.setFieldState("registerPhoneInput", validator.checkPhone(oData.Phone)),
                this.setFieldState("registerPasswordInput", validator.checkPassword(oData.Password)),
                this.setFieldState("registerPasswordRepeatInput",
                    validator.checkPasswordRepeat(oData.Password, oData.PasswordRepeat))
            ];

            // Die Zustimmung zu AGB und Datenschutz ist Pflicht
            var bTermsOk = oData.AcceptedTerms === true;
            this.byId("registerTermsStrip").setVisible(!bTermsOk);

            return aResults.indexOf(false) === -1 && bTermsOk;
        },

        /**
         * Prüft den freiwilligen Abschnitt "Adresse", aber erst, wenn dort etwas steht:
         * leer ist erlaubt, halb ausgefüllt wäre unbrauchbar
         * @returns {boolean} true, wenn die Adresse leer oder vollständig ist
         */
        _validateAddress: function () {
            var oAddress = this.getModel("registration").getProperty("/Address");
            var bTouched = [oAddress.City, oAddress.PostalCode, oAddress.Street, oAddress.CompanyName]
                .some(function (sValue) {
                    return sValue.trim() !== "";
                });

            if (!bTouched) {
                // Alte Markierungen entfernen, falls der Nutzer die Felder wieder geleert hat
                aAddressFields.forEach(function (sFieldId) {
                    this.setFieldState(sFieldId, "");
                }, this);
                return true;
            }

            var aResults = [
                this.setFieldState("registerCityInput", validator.checkRequired(oAddress.City)),
                this.setFieldState("registerPostalCodeInput",
                    validator.checkPostalCode(oAddress.PostalCode, oAddress.Country)),
                this.setFieldState("registerStreetInput", validator.checkRequired(oAddress.Street))
            ];

            var bValid = aResults.indexOf(false) === -1;
            if (!bValid) {
                // In einem eingeklappten Abschnitt sähe der Nutzer die Markierungen nicht
                this.byId("registerAddressPanel").setExpanded(true);
            }
            return bValid;
        },

        /**
         * Prüft den freiwilligen Abschnitt "Zahlungsmittel" - nur die gewählte
         * Zahlungsart und nur, wenn zu ihr etwas eingetragen ist
         * @returns {boolean} true, wenn das Zahlungsmittel leer oder vollständig ist
         */
        _validatePayment: function () {
            var oPayment = this.getModel("registration").getProperty("/Payment");
            var aFields = oPaymentFields[oPayment.Type];

            var bTouched = aFields.some(function (oField) {
                return oPayment[oField.property].trim() !== "";
            });

            if (!bTouched) {
                this._clearPaymentFields();
                return true;
            }

            var aResults = aFields.map(function (oField) {
                return this.setFieldState(oField.id, oField.check(oPayment[oField.property]));
            }, this);

            var bValid = aResults.indexOf(false) === -1;
            if (!bValid) {
                this.byId("registerPaymentPanel").setExpanded(true);
            }
            return bValid;
        },

        /**
         * Räumt beim Wechsel der Zahlungsart die Markierungen der vorher
         * sichtbaren Felder weg
         */
        onPaymentTypeChange: function () {
            this._clearPaymentFields();
        },

        /**
         * Entfernt die Fehlermarkierungen aller Zahlungsfelder, unabhängig vom Typ
         */
        _clearPaymentFields: function () {
            Object.keys(oPaymentFields).forEach(function (sType) {
                oPaymentFields[sType].forEach(function (oField) {
                    this.setFieldState(oField.id, "");
                }, this);
            }, this);
        },

        /**
         * Räumt beim Wechsel des Landes die PLZ-Meldung weg, weil dann eine
         * andere Regel gilt
         */
        onCountryChange: function () {
            this.setFieldState("registerPostalCodeInput", "");
        },

        /**
         * Baut aus den Formularwerten den Datensatz im Format von Users.json
         * @returns {object}
         */
        _buildUser: function () {
            var oData = this.getModel("registration").getData();

            return {
                // Dauerhafte Kennung: Sie bleibt gleich, auch wenn die E-Mail-Adresse
                // später geändert wird - danach wird der Datensatz wiedergefunden
                UserId: "U" + Date.now(),
                Salutation: aSalutations[oData.SalutationIndex],
                FirstName: oData.FirstName.trim(),
                LastName: oData.LastName.trim(),
                Email: oData.Email.trim(),
                Phone: oData.Phone.trim(),
                Password: oData.Password,
                AcceptedTerms: oData.AcceptedTerms,
                Newsletter: oData.Newsletter,
                DiscountInfo: oData.DiscountInfo,
                Address: {
                    Country: oData.Address.Country,
                    City: oData.Address.City.trim(),
                    PostalCode: oData.Address.PostalCode.trim(),
                    Street: oData.Address.Street.trim(),
                    CompanyName: oData.Address.CompanyName.trim()
                },
                Payment: {
                    Type: oData.Payment.Type,
                    AccountHolder: oData.Payment.AccountHolder.trim(),
                    Iban: oData.Payment.Iban.trim(),
                    CardHolder: oData.Payment.CardHolder.trim(),
                    CardNumber: oData.Payment.CardNumber.trim(),
                    CardExpiry: oData.Payment.CardExpiry.trim(),
                    PaypalEmail: oData.Payment.PaypalEmail.trim()
                    // Die Prüfziffer wird geprüft, aber nicht übernommen - sie
                    // bestätigt nur eine einzelne Zahlung
                }
            };
        },

        /**
         * Setzt Formularwerte und Fehlermarkierungen zurück
         */
        _resetForm: function () {
            this.setModel(models.createRegistrationModel(), "registration");

            aAccountFields.concat(aAddressFields).forEach(function (sFieldId) {
                this.setFieldState(sFieldId, "");
            }, this);

            this._clearPaymentFields();

            this.byId("registerTermsStrip").setVisible(false);
            this.byId("registerAddressPanel").setExpanded(false);
            this.byId("registerPaymentPanel").setExpanded(false);
        }
    });
});
