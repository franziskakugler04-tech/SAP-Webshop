sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "../model/cart",
    "../model/wishlist",
    "sap/ui/core/Fragment",
    "sap/m/BadgeCustomData"
], function (BaseController, formatter, cart, wishlist, Fragment, BadgeCustomData) {
    "use strict";

    return BaseController.extend("my.ui5.app.controller.App", {

        formatter: formatter,

        /**
         * Hängt die Zahlen an Warenkorb- und Herz-Symbol an die beiden Modelle
         */
        onInit: function () {
            // Ein PropertyBinding meldet jedes setProperty auf /Items, damit die
            // Zahlen an den Symbolen nachziehen
            this.getCartModel().bindProperty("/Items").attachChange(this._updateCartBadge, this);
            this.getWishlistModel().bindProperty("/Items").attachChange(this._updateWishlistBadge, this);

            // Einmal zu Beginn, damit ein vor dem Reload gefüllter Warenkorb
            // seine Zahl sofort zeigt
            this._updateCartBadge();
            this._updateWishlistBadge();
        },

        /**
         * Schreibt die Stückzahl an das Warenkorb-Symbol
         */
        _updateCartBadge: function () {
            this._setBadge("cartButton", cart.getItemCount(this.getCartItems()));
        },

        /**
         * Schreibt die Zahl der gemerkten Produkte an das Herz-Symbol; gezählt werden
         * Produkte, nicht Stücke - eine Merkliste kennt keine Menge
         */
        _updateWishlistBadge: function () {
            this._setBadge("favoritesButton", this.getWishlistItems().length);
        },

        /**
         * Setzt die rote Zahl an einem Symbol der Kopfzeile. Bei 0 wird sie entfernt
         * statt auf "0" gesetzt - eine Null wäre kein Hinweis, sondern Rauschen
         * @param {string} sButtonId Id des Knopfes in der View
         * @param {int} iCount anzuzeigende Anzahl
         */
        _setBadge: function (sButtonId, iCount) {
            var oButton = this.byId(sButtonId);

            oButton.destroyCustomData();

            if (iCount > 0) {
                oButton.addCustomData(new BadgeCustomData({
                    value: String(iCount)
                }));
            }
        },

        /**
         * Öffnet den Warenkorb als Popover neben dem Warenkorb-Symbol
         * @param {sap.ui.base.Event} oEvent
         */
        onHeaderCartPress: function (oEvent) {
            var oView = this.getView();
            var oButton = oEvent.getSource();

            if (!this._pCartPopover) {
                this._pCartPopover = Fragment.load({
                    id: oView.getId(),
                    name: "my.ui5.app.fragment.CartPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pCartPopover.then(function (oPopover) {
                oPopover.openBy(oButton);
            });
        },

        /**
         * Entfernt eine Position über den Löschen-Knopf der Warenkorb-Liste; welche
         * gemeint ist, steht im Bindungskontext der Zeile
         * @param {sap.ui.base.Event} oEvent
         */
        onCartItemDelete: function (oEvent) {
            var oItem = oEvent.getParameter("listItem").getBindingContext("cart").getObject();
            this.removeFromCart(oItem.ProductId);
        },

        /**
         * Übernimmt eine im Warenkorb geänderte Menge. Der Weg über setCartQuantity
         * begrenzt sie auf den Lagerbestand und sichert sie im Browser
         * @param {sap.ui.base.Event} oEvent
         */
        onCartQuantityChange: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("cart").getObject();
            this.setCartQuantity(oItem.ProductId, oEvent.getParameter("value"));
        },

        /**
         * Schließt den Warenkorb und führt zur Kasse; ohne das Schließen bliebe
         * das Popover über der neuen Seite stehen
         */
        onCartCheckoutPress: function () {
            this.byId("cartPopover").close();
            this.getRouter().navTo("checkout");
        },

        /**
         * Öffnet die Merkliste als Popover neben dem Herz-Symbol
         * @param {sap.ui.base.Event} oEvent
         */
        onHeaderFavoritesPress: function (oEvent) {
            var oView = this.getView();
            var oButton = oEvent.getSource();

            if (!this._pWishlistPopover) {
                this._pWishlistPopover = Fragment.load({
                    id: oView.getId(),
                    name: "my.ui5.app.fragment.WishlistPopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pWishlistPopover.then(function (oPopover) {
                oPopover.openBy(oButton);
            });
        },

        /**
         * Sucht global über die Kopfzeile und führt zur Produktübersicht
         * @param {sap.ui.base.Event} oEvent
         */
        onHeaderSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");

            this.getRouter().navTo("products", {
                category: "ALL",
                "?query": {
                    search: sQuery
                }
            });
        },

        /**
         * Führt über das Logo zurück zur Startseite
         */
        onNavBack: function () {
            this.getRouter().navTo("main");
        },

        /**
         * Der Avatar rechts im Header führt je nach Anmeldestatus zum Profil
         * oder zur Anmeldung
         */
        onHeaderProfilePress: function () {
            var bLoggedIn = this.getModel("user").getProperty("/LoggedIn");
            this.getRouter().navTo(bLoggedIn ? "profile" : "login");
        },

        /**
         * Nimmt ein Produkt über den Löschen-Knopf aus der Merkliste
         * @param {sap.ui.base.Event} oEvent
         */
        onWishlistItemDelete: function (oEvent) {
            var sProductId = oEvent.getParameter("listItem").getBindingContext("wishlist").getObject().ProductId;
            this._applyWishlistItems(wishlist.removeItem(this.getWishlistItems(), sProductId));
        },

        /**
         * Legt die ganze Merkliste in den Warenkorb und leert sie danach
         */
        onWishlistAddAllToCart: function () {
            var aItems = this.getWishlistItems();
            var aCartItems = this.getCartItems();

            aItems.forEach(function (oItem) {
                aCartItems = cart.addItem(aCartItems, {
                    ProductId: oItem.ProductId,
                    Name: oItem.Name,
                    Price: oItem.Price,
                    ImageUrl: oItem.ImageUrl,
                    Stock: oItem.Stock
                });
            });

            this._applyCartItems(aCartItems);
            this._applyWishlistItems([]);
            this.byId("wishlistPopover").close();
        },

        /**
         * Legt ein einzelnes gemerktes Produkt in den Warenkorb
         * @param {sap.ui.base.Event} oEvent
         */
        onWishlistAddSingleToCart: function (oEvent) {
            var oItem = oEvent.getSource().getBindingContext("wishlist").getObject();
            this.addToCart({
                ProductId: oItem.ProductId,
                Name: oItem.Name,
                Price: oItem.Price,
                ImageUrl: oItem.ImageUrl,
                Stock: oItem.Stock
            });
        }
    });
});