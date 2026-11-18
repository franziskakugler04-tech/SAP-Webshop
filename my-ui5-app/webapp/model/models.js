sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "./userStorage",
    "./cart",
    "./wishlist"
], function (JSONModel, Device, userStorage, cart, wishlist) {
    "use strict";

    return {

        /**
         * Modell mit Geräteinformationen (Desktop/Tablet/Phone)
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Lädt die Produkt-Mockdaten als JSONModel; kein Server nötig
         */
        createProductsModel: function () {
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("my/ui5/app/model/mockdata/Products.json"));
            return oModel;
        },

        /**
         * Lädt die Kategorien-Mockdaten als JSONModel
         */
        createCategoriesModel: function () {
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("my/ui5/app/model/mockdata/Categories.json"));
            return oModel;
        },

        /**
         * Lädt die Versandarten; sie stehen in den Mockdaten, damit Preis und
         * Dauer an einer Stelle gepflegt werden
         */
        createShippingModel: function () {
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("my/ui5/app/model/mockdata/Shipping.json"));
            return oModel;
        },

        /**
         * Lädt die gültigen Gutscheincodes als JSONModel
         */
        createCouponsModel: function () {
            var oModel = new JSONModel();
            oModel.loadData(sap.ui.require.toUrl("my/ui5/app/model/mockdata/Coupons.json"));
            return oModel;
        },

        /**
         * App-weites Benutzer-Modell mit /LoggedIn, /CurrentUser und /Users.
         * Die Mockdaten kommen asynchron, deshalb der Umweg über ein zweites Modell
         */
        createUserModel: function () {
            var oModel = new JSONModel({
                LoggedIn: false,
                CurrentUser: null,
                Users: []
            });

            var oMockModel = new JSONModel();
            oMockModel.loadData(sap.ui.require.toUrl("my/ui5/app/model/mockdata/Users.json"));

            // Das Promise hängt am Modell, damit Controller darauf warten können - beim
            // Aufruf über die Adresszeile steht der Anmeldestatus sonst noch nicht fest
            oModel.pReady = oMockModel.dataLoaded().then(function () {
                var aStored = userStorage.loadUsers();

                // Im Browser gespeicherte Konten haben Vorrang, sonst stünde ein im
                // Profil geändertes Demo-Konto zweimal in der Liste
                var aMockUsers = (oMockModel.getProperty("/Users") || []).filter(function (oMockUser) {
                    return !aStored.some(function (oStoredUser) {
                        return oStoredUser.UserId === oMockUser.UserId;
                    });
                });

                var aUsers = aMockUsers.concat(aStored);
                oModel.setProperty("/Users", aUsers);

                // Wer sich vor dem Reload angemeldet hat, bleibt angemeldet
                var sEmail = userStorage.getSession();
                if (!sEmail) {
                    return;
                }
                var oUser = aUsers.find(function (oKandidat) {
                    return oKandidat.Email.toLowerCase() === sEmail.toLowerCase();
                });
                if (oUser) {
                    oModel.setProperty("/CurrentUser", oUser);
                    oModel.setProperty("/LoggedIn", true);
                }
            });

            return oModel;
        },

        /**
         * App-weites Warenkorb-Modell, in jeder View unter dem Namen "cart" (/Items,
         * siehe model/cart.js). Kein Warten nötig, nichts wird nachgeladen
         */
        createCartModel: function () {
            return new JSONModel({
                Items: cart.loadItems()
            });
        },

        /**
         * App-weites Merkliste-Modell, in jeder View unter dem Namen "wishlist"
         */
        createWishlistModel: function () {
            return new JSONModel({
                Items: wishlist.loadItems()
            });
        },

        /**
         * Modell des Registrierungsformulars; die View bindet zweiwegig dagegen.
         * Wird beim Öffnen neu erzeugt und ist dadurch automatisch wieder leer
         */
        createRegistrationModel: function () {
            return new JSONModel({
                // 3 = "Keine Angabe" als neutrale Vorbelegung der Anrede-Auswahl
                SalutationIndex: 3,
                FirstName: "",
                LastName: "",
                Email: "",
                Phone: "",
                Password: "",
                PasswordRepeat: "",
                AcceptedTerms: false,
                Newsletter: false,
                DiscountInfo: false,
                // Adresse und Zahlungsmittel sind freiwillig; Struktur wie in Users.json,
                // damit der fertige Datensatz ohne Umbau gespeichert werden kann
                Address: {
                    Country: "DE",
                    City: "",
                    PostalCode: "",
                    Street: "",
                    CompanyName: ""
                },
                Payment: {
                    Type: "SEPA",
                    AccountHolder: "",
                    Iban: "",
                    CardHolder: "",
                    CardNumber: "",
                    CardExpiry: "",
                    CardCvc: "",
                    PaypalEmail: ""
                }
            });
        },

        /**
         * Modell der Kasse. Adresse und Zahlungsmittel sind Kopien der Profildaten,
         * damit eine abweichende Lieferadresse das Konto nicht ändert
         * @param {object} oUser angemeldeter Benutzer
         */
        createCheckoutModel: function (oUser) {
            var oAddress = oUser.Address || {};
            var oPayment = oUser.Payment || {};

            return new JSONModel({
                Address: {
                    Country: oAddress.Country || "DE",
                    City: oAddress.City || "",
                    PostalCode: oAddress.PostalCode || "",
                    Street: oAddress.Street || "",
                    CompanyName: oAddress.CompanyName || ""
                },
                Payment: {
                    Type: oPayment.Type || "SEPA",
                    AccountHolder: oPayment.AccountHolder || "",
                    Iban: oPayment.Iban || "",
                    CardHolder: oPayment.CardHolder || "",
                    CardNumber: oPayment.CardNumber || "",
                    CardExpiry: oPayment.CardExpiry || "",
                    // Die Prüfziffer wird nie gespeichert, also für jede Zahlung neu
                    CardCvc: "",
                    PaypalEmail: oPayment.PaypalEmail || ""
                },
                ShippingId: "STANDARD",
                // Karte, die gerade bearbeitet wird ("" = nur Anzeige)
                EditSection: "",
                CouponCode: "",
                // Der eingelöste Gutschein, sonst null
                AppliedCoupon: null,
                // Beträge als Zahlen; formatiert wird erst in der View
                Totals: {
                    Subtotal: 0,
                    Discount: 0,
                    Shipping: 0,
                    Total: 0
                }
            });
        },

        /**
         * Modell des Benutzerprofils; es hält nur den Zustand der Oberfläche,
         * die Daten selbst stehen im Modell "user"
         */
        createProfileModel: function () {
            return new JSONModel({
                // Feld, das gerade bearbeitet wird ("" = nur Anzeige), und der
                // Zwischenspeicher dazu - es wird immer nur eine Zeile bearbeitet
                EditField: "",
                Value: "",
                // Eigene Zwischenspeicher für die beiden Auswahllisten
                CountryValue: "DE",
                PaymentTypeValue: "SEPA",
                // Eingaben des Passwort-Dialogs
                Password: {
                    Current: "",
                    New: "",
                    Repeat: ""
                }
            });
        }
    };
});
