sap.ui.define([
    "./browserStorage"
], function (browserStorage) {
    "use strict";

    /*
     * Warenkorb: Rechenregeln und Speicherung, bewusst ohne UI5-Bezug. Die Methoden geben
     * ein NEUES Array zurück, sonst merkt das JSONModel die Änderung nicht
     */

    var sCartKey = "clipUndCo.cart";
    var sOrderKey = "clipUndCo.lastOrder";

    /**
     * Sucht die Position zu einem Produkt
     * @param {object[]} aItems bisherige Positionen
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
         * Liefert den Preis, den ein Produkt tatsächlich kostet. Steht hier, weil
         * Übersicht, Warenkorb und Kasse dieselbe Regel brauchen
         * @param {object} oProduct Datensatz aus Products.json
         * @returns {float} Angebotspreis, sonst der reguläre Preis
         */
        getEffectivePrice: function (oProduct) {
            return oProduct.IsOnSale ? oProduct.OnSalePrice : oProduct.Price;
        },

        /**
         * Liefert die gespeicherten Positionen
         * @returns {object[]}
         */
        loadItems: function () {
            var aItems = browserStorage.read(sCartKey, []);
            return Array.isArray(aItems) ? aItems : [];
        },

        /**
         * Sichert die Positionen im Browser
         * @param {object[]} aItems
         */
        saveItems: function (aItems) {
            browserStorage.write(sCartKey, aItems);
        },

        /**
         * Leert den Warenkorb dauerhaft, zum Beispiel nach einer Bestellung
         */
        clearItems: function () {
            browserStorage.remove(sCartKey);
        },

        /**
         * Legt ein Produkt in den Warenkorb; ist es schon enthalten, wächst nur die
         * Menge. Der Preis wird eingefroren, damit ein Preiswechsel den Einkauf nicht ändert
         * @param {object[]} aItems bisherige Positionen
         * @param {object} oProduct Datensatz aus Products.json
         * @returns {object[]} neue Positionen
         */
        addItem: function (aItems, oProduct) {
            var aNewItems = aItems.slice();
            var iIndex = findIndex(aNewItems, oProduct.ProductId);

            if (iIndex !== -1) {
                var oExisting = aNewItems[iIndex];
                aNewItems[iIndex] = Object.assign({}, oExisting, {
                    Quantity: Math.min(oExisting.Quantity + 1, oExisting.Stock)
                });
                return aNewItems;
            }

            aNewItems.push({
                ProductId: oProduct.ProductId,
                Name: oProduct.Name,
                Price: this.getEffectivePrice(oProduct),
                ImageUrl: oProduct.ImageUrl,
                // Lagerbestand wandert mit, damit das Mengenfeld in der Kasse eine
                // Obergrenze hat, ohne die Produktdaten nachzuladen
                Stock: oProduct.Stock,
                Quantity: 1
            });
            return aNewItems;
        },

        /**
         * Setzt die Menge einer Position, begrenzt auf 1 bis Lagerbestand. Entfernt wird
         * nur über removeItem - eine Menge von 0 als heimliches Löschen wäre verwirrend
         * @param {object[]} aItems bisherige Positionen
         * @param {string} sProductId Kennung des Produkts
         * @param {int} iQuantity gewünschte Menge
         * @returns {object[]} neue Positionen
         */
        setQuantity: function (aItems, sProductId, iQuantity) {
            var aNewItems = aItems.slice();
            var iIndex = findIndex(aNewItems, sProductId);

            if (iIndex === -1) {
                return aNewItems;
            }

            var oItem = aNewItems[iIndex];
            aNewItems[iIndex] = Object.assign({}, oItem, {
                Quantity: Math.max(1, Math.min(iQuantity, oItem.Stock))
            });
            return aNewItems;
        },

        /**
         * Nimmt eine Position aus dem Warenkorb
         * @param {object[]} aItems bisherige Positionen
         * @param {string} sProductId Kennung des Produkts
         * @returns {object[]} neue Positionen
         */
        removeItem: function (aItems, sProductId) {
            return aItems.filter(function (oItem) {
                return oItem.ProductId !== sProductId;
            });
        },

        /**
         * Zwischensumme aller Positionen, also ohne Versand und Rabatt
         * @param {object[]} aItems
         * @returns {float}
         */
        getSubtotal: function (aItems) {
            return aItems.reduce(function (fSum, oItem) {
                return fSum + oItem.Price * oItem.Quantity;
            }, 0);
        },

        /**
         * Gesamtzahl der Stücke im Warenkorb - die Zahl am Warenkorb-Symbol.
         * Gezählt werden Stücke, nicht Positionen
         * @param {object[]} aItems
         * @returns {int}
         */
        getItemCount: function (aItems) {
            return aItems.reduce(function (iCount, oItem) {
                return iCount + oItem.Quantity;
            }, 0);
        },

        /**
         * Sichert die abgeschickte Bestellung im Browser, damit die
         * Bestätigungsseite einen Reload übersteht
         * @param {object} oOrder
         */
        saveLastOrder: function (oOrder) {
            browserStorage.write(sOrderKey, oOrder);
        },

        /**
         * Liefert die zuletzt abgeschickte Bestellung
         * @returns {object|null}
         */
        loadLastOrder: function () {
            return browserStorage.read(sOrderKey, null);
        }
    };
});
