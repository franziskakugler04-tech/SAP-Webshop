
sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
    "use strict";

    new ComponentContainer({
        name: "my.ui5.app",
        settings: {
            id: "myuiapp"
        },
        async: true,
        // Ohne diese Angabe wäre der Container nur so hoch wie sein Inhalt und
        // das height:100% der App-View liefe ins Leere
        height: "100%"
    }).placeAt("content");
});
