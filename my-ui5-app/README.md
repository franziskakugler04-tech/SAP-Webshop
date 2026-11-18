# My UI5 App

SAPUI5/OpenUI5-Beispielprojekt mit **lokalen Mockdaten** (keine Server-Logik nötig).
Entstanden als Studienprojekt im Rahmen des Faches "SAP-Factory: Webentwicklung für Produktion und Logistik".

## Team

- Franziska Marga Kugler
- Lukas Heberl

**Modul:** SAP-Factory: Webentwicklung für Produktion und Logistik
**Hochschule:** Ostbayerische Technische Hochschule Amberg-Weiden
**Semester:** Semester 6, Sommersemester 2026

## Starten (lokale Entwicklung)

```bash
npm install
npm start
```

Das öffnet die App über den UI5-Tooling-Devserver im Browser (Standard: http://localhost:8080).

## Testen

```
npx ui5 serve -o test/unit/unitTests.qunit.html
```

## Funktionsüberblick

Die App bildet einen einfachen Webshop nach und umfasst u. a.:

- Startseite mit Hinweis auf Kategorien, Sommerangebot, Newsletteranmeldung und neue Produkte
- Produktübersicht mit Filter- und Sortiermöglichkeiten, sowie Vorschläge für den Nutzer
- Produktdetailseite mit Empfehlungen und der Möglichkeit das Produkt zu bewerten
- Angebot- und Rabattmarkierung
- Warenkorb und Kasse (Checkout) inklusive Adresse, Zahlungsart, Versandart und Gutschein
- Login und Registrierung
- Nutzerprofil
- Wunschliste
- Newsletter-Anmeldung
- Bestellbestätigung

Alle Daten (Produkte, Nutzer, Warenkorb etc.) liegen als lokale Mockdaten vor – es ist kein Backend erforderlich.

## Struktur

```
my-ui5-app/
├── webapp/
│ ├── assets/
│ ├── controller/
│ │ ├── App.controller.js
│ │ ├── BaseController.js
│ │ ├── Checkout.controller.js
│ │ ├── Login.controller.js
│ │ ├── Main.controller.js
│ │ ├── Newsletter.controller.js
│ │ ├── NotFound.controller.js
│ │ ├── OrderConfirmation.controller.js
│ │ ├── ProductDetail.controller.js
│ │ ├── ProductOverview.controller.js
│ │ ├── Profile.controller.js
│ │ └── Register.controller.js
│ ├── view/
│ │ ├── App.view.xml
│ │ ├── Checkout.view.xml
│ │ ├── Login.view.xml
│ │ ├── Main.view.xml
│ │ ├── Newsletter.view.xml
│ │ ├── NotFound.view.xml
│ │ ├── OrderConfirmation.view.xml
│ │ ├── ProductDetail.view.xml
│ │ ├── ProductOverview.view.xml
│ │ ├── Profile.view.xml
│ │ └── Register.view.xml
│ ├── fragment/
│ │ ├── CartPopover.fragment.xml
│ │ ├── FilterPanel.fragment.xml
│ │ ├── GlobalFooter.fragment.xml
│ │ ├── PasswordDialog.fragment.xml
│ │ ├── ProductRecommendations.fragment.xml
│ │ └── WishlistPopover.fragment.xml
│ ├── model/
│ │ ├── mockdata/
│ │ ├── browserStorage.js
│ │ ├── cart.js
│ │ ├── formatter.js
│ │ ├── models.js 
│ │ ├── userStorage.js
│ │ ├── validator.js
│ │ └── wishlist.js
│ ├── i18n/
│ │ └── i18n.properties
│ ├── css/
│ │ └── style.css
│ ├── test/ 
│ ├── Component.js
│ ├── manifest.json
│ └── index.html
├── ui5.yaml
└── package.json
```

## Mockdaten

Die Beispieldaten liegen statisch unter `webapp/model/mockdata/`.
Sie werden in `model/models.js` per `JSONModel.loadData(...)` geladen –
**kein Mockserver, kein Backend nötig.**

Neue Testdaten (Produkten, Kategorien, Nutzer etc.) können direkt in dieser JSON-Datei ergänzt werden.