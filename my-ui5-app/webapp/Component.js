sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "my/ui5/app/model/models"
], function (UIComponent, Device, models) {
    "use strict";

    return UIComponent.extend("my.ui5.app.Component", {

        metadata: {
            manifest: "json"
        },

        /**
         * Setzt die app-weiten Modelle und startet den Router. Die Modelle stehen VOR
         * der Basisklasse, weil der Controller der rootView schon auf sie zugreift
         */
        init: function () {
            // Geräteinformationen für die responsive Darstellung
            this.setModel(models.createDeviceModel(), "device");

            // Anmeldestatus und Konten - gebraucht in Kopfzeile, Anmeldung, Registrierung
            this.setModel(models.createUserModel(), "user");

            // Warenkorb: Kopfzeile zeigt die Anzahl, Übersicht legt hinein, Kasse liest
            this.setModel(models.createCartModel(), "cart");

            // Merkliste für Kopfzeile, Produktkacheln und Popover
            this.setModel(models.createWishlistModel(), "wishlist");

            // Basisklasse initialisieren, das erzeugt unter anderem die rootView
            UIComponent.prototype.init.apply(this, arguments);

            this.getRouter().initialize();
        }
    });
});
