sap.ui.define([
    "./browserStorage"
], function (browserStorage) {
    "use strict";

    /*
     * Merkliste: Speicherung der gemerkten Produkte, aufgebaut wie model/cart.js.
     * Die Methoden geben ein NEUES Array zurück, sonst merkt das JSONModel nichts
     */

    var sWishlistKey = "clipUndCo.wishlist";

    /**
     * Sucht die Position zu einem Produkt
     * @param {object[]} aItems gemerkte Produkte
     * @param {string} sProductId Kennung des Produkts
     * @returns {int} Position im Array oder -1
     */
    function findIndex(aItems, sProductId) {
        return aItems.findIndex(function (oItem) {
            return oItem.ProductId === sProductId;
        });
    }

    return {

        /**
         * Liefert den Preis, den ein Produkt tatsächlich kostet
         * @param {object} oProduct Datensatz aus Products.json
         * @returns {float} Angebotspreis, sonst der reguläre Preis
         */
        getEffectivePrice: function (oProduct) {
            return oProduct.IsOnSale ? oProduct.OnSalePrice : oProduct.Price;
        },

        /**
         * Liefert die gemerkten Produkte
         * @returns {object[]}
         */
        loadItems: function () {
            var aItems = browserStorage.read(sWishlistKey, []);
            return Array.isArray(aItems) ? aItems : [];
        },

        /**
         * Sichert die Merkliste im Browser
         * @param {object[]} aItems
         */
        saveItems: function (aItems) {
            browserStorage.write(sWishlistKey, aItems);
        },

        /**
         * Leert die Merkliste dauerhaft
         */
        clearItems: function () {
            browserStorage.remove(sWishlistKey);
        },

        /**
         * Merkt ein Produkt; ist es schon enthalten, bleibt die Liste unverändert.
         * Anders als im Warenkorb gibt es keine Menge, deshalb kein Hochzählen
         * @param {object[]} aItems bisherige Merkliste
         * @param {object} oProduct Datensatz aus Products.json
         * @returns {object[]} neue Merkliste
         */
        addItem: function (aItems, oProduct) {
            var aNewItems = aItems.slice();
            if (findIndex(aNewItems, oProduct.ProductId) !== -1) {
                return aNewItems;
            }

            aNewItems.push({
                ProductId: oProduct.ProductId,
                Name: oProduct.Name,
                Price: this.getEffectivePrice(oProduct),
                ImageUrl: oProduct.ImageUrl,
                Stock: oProduct.Stock
            });
            return aNewItems;
        },

        /**
         * Nimmt ein Produkt aus der Merkliste
         * @param {object[]} aItems bisherige Merkliste
         * @param {string} sProductId Kennung des Produkts
         * @returns {object[]} neue Merkliste
         */
        removeItem: function (aItems, sProductId) {
            return aItems.filter(function (oItem) {
                return oItem.ProductId !== sProductId;
            });
        }
    };
});
