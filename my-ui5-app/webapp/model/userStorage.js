sap.ui.define([
    "./browserStorage"
], function (browserStorage) {
    "use strict";

    /*
     * Konten und laufende Sitzung im Browser, Zugriff über model/browserStorage.js.
     * Die Passwörter liegen im Klartext - ohne Serverseite gibt es keinen Hash-Abgleich
     */

    var sUsersKey = "clipUndCo.users";
    var sSessionKey = "clipUndCo.session";

    /**
     * Liefert alle im Browser registrierten Konten
     * @returns {object[]}
     */
    function loadUsers() {
        var aUsers = browserStorage.read(sUsersKey, []);
        return Array.isArray(aUsers) ? aUsers : [];
    }

    return {

        loadUsers: loadUsers,

        /**
         * Hängt ein neu registriertes Konto an die gespeicherten Konten an
         * @param {object} oUser
         */
        saveUser: function (oUser) {
            var aUsers = loadUsers();
            aUsers.push(oUser);
            browserStorage.write(sUsersKey, aUsers);
        },

        /**
         * Schreibt einen im Profil geänderten Datensatz zurück, gesucht über die UserId.
         * Geänderte Demo-Konten landen so erstmals im Browser und haben dann Vorrang
         * @param {object} oUser geänderter Datensatz
         */
        updateUser: function (oUser) {
            var aUsers = loadUsers();
            var iIndex = aUsers.findIndex(function (oKandidat) {
                return oKandidat.UserId === oUser.UserId;
            });

            if (iIndex === -1) {
                aUsers.push(oUser);
            } else {
                aUsers[iIndex] = oUser;
            }
            browserStorage.write(sUsersKey, aUsers);
        },

        /**
         * Liefert die E-Mail-Adresse der laufenden Sitzung
         * @returns {string|null}
         */
        getSession: function () {
            return browserStorage.read(sSessionKey, null);
        },

        /**
         * Merkt sich den angemeldeten Benutzer; null meldet ab
         * @param {string|null} sEmail
         */
        setSession: function (sEmail) {
            if (sEmail) {
                browserStorage.write(sSessionKey, sEmail);
                return;
            }
            browserStorage.remove(sSessionKey);
        }
    };
});
