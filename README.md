# Corsivo Focal Point

Punto focale per le immagini in evidenza: coordinate per contenuto, editor block/classic e applicazione frontend tramite `object-position`.

## Scopo e confini

Il plugin conserva il soggetto importante quando una featured image viene mostrata con `object-fit: cover`. Non genera crop, non modifica attachment o file media e non introduce un proprio componente immagine: aggiunge soltanto `object-position` al markup già prodotto da WordPress o dalle integrazioni abilitate.

Il dato appartiene al post, ma è legato all'ID dell'immagine in evidenza corrente. Se la featured image cambia, le vecchie coordinate restano persistite ma inattive finché l'editor non salva una nuova associazione. Il valore centrale 50/50 è il default e non aggiunge stile al frontend.

## Requisiti e dipendenze

Richiede WordPress 6.6+ e PHP 8.1+. Usa `@corsivo-suite/wp-admin-ui/focal-point-control` 0.1.0, basato sul `FocalPointPicker` core, oltre a `register_post_meta`, revisioni/autosave, data store dell'editor, media frame, `WP_HTML_Tag_Processor` e Settings API. La dipendenza Corsivo è risolta esclusivamente durante la build e non richiede il plugin showcase a runtime.

WooCommerce e WPML sono integrazioni facoltative e devono essere abilitate nelle impostazioni. Yoast non richiede un modulo: il focal point è CSS e non cambia l'immagine usata nei meta social.

## Bootstrap e lifecycle

`corsivo-focal-point.php` definisce versione e chiavi meta, carica settings, data, editor, frontend e integrazioni, quindi registra l'activation hook. Su `plugins_loaded` a priorità 5 viene creata l'option predefinita se manca; l'attivazione esegue lo stesso setup sul sito corrente o, in network activation, su tutti i blog in batch da 100 con `switch_to_blog()`.

Non registra cron o operazioni di deactivation. La disinstallazione è conservativa per default. Se `delete_on_uninstall` è attivo, `uninstall.php` attraversa ogni sito, elimina le quattro chiavi meta con verifica fisica, quindi elimina e verifica l'option; un errore interrompe il cleanup con eccezione.

## Architettura

`settings.php` gestisce option e pagina Impostazioni. `data.php` è il dominio: post type, sanitizzazione, letture, scrittura coordinata, revisioni e autosave. `editor.php` decide block/classic editor, registra pannello/meta box e coordina i save REST e form. `frontend.php` riscrive il primo `img`. `integrations.php` aggancia WooCommerce e implementa la policy WPML copy-once.

`admin-app` compila due entry JavaScript pure: `editor.js` monta un `PluginDocumentSettingPanel`; `classic-editor.js` monta lo stesso controllo nel meta box e osserva il cambio featured image. Il loader PHP accetta soltanto build complete con manifest, JS, CSS LTR e CSS RTL; in caso contrario conserva il fallback legacy sotto `assets/`.

## Storage e contratti dati

Non ci sono tabelle custom.

| Record | Tipo | Contratto |
|---|---|---|
| `_corsivo_focal_point_x` | post meta integer | Coordinata 0–100, default 50. |
| `_corsivo_focal_point_y` | post meta integer | Coordinata 0–100, default 50. |
| `_corsivo_focal_point_attachment_id` | post meta integer | ID attachment cui si riferiscono le coordinate; default 0. |
| `_corsivo_focal_point_revision_version` | revision meta | Marker `1:<sha256>` usato per attestare uno snapshot completo. |
| `corsivo_focal_point_settings` | option autoload | `post_types`, `woocommerce_enabled`, `wpml_copy_once_enabled`, `delete_on_uninstall`. |

I tre meta pubblici sono `single`, `integer`, esposti nel REST core e autorizzati con `edit_post` sul contenuto. Le coordinate vengono arrotondate e clampate; input non numerico o infinito torna a 50. `corsivo_focal_point_update_position()` deduplica eventuali righe multiple, applica i tre valori e tenta un rollback verificato se una scrittura fallisce.

Revisioni e autosave includono anche il valore zero. Il marker lega coordinate e attachment in un solo snapshot: restore incompleti o alterati vengono rifiutati. La featured image non è versionata da WordPress e non viene ripristinata.

## Flussi end-to-end

Block editor: PHP registra i meta e aggiunge `custom-fields` solo ai post type abilitati. Il pannello legge `meta` e `featured_media` dal data store, risolve l'attachment via core-data, mostra `FocalPointPicker` e salva atomically i tre valori nel payload del post. Un cambio immagine rende irrilevante la vecchia associazione.

Classic editor: il meta box emette nonce, stato e fallback. Il componente React osserva `#postimagediv` con `MutationObserver`, mantiene una cache di coordinate per attachment durante la sessione e invia hidden input solo quando serve. `save_post` verifica nonce, capability, post type, autosave/revision e corrispondenza dell'attachment prima della scrittura coordinata.

Frontend: `post_thumbnail_html` controlla post type, presenza del focal point e legame con la featured image; `WP_HTML_Tag_Processor` trova il primo `IMG`, conserva gli altri stili, rimuove un precedente `object-position` e inserisce il valore corrente. Markup senza immagini o posizione centrale resta invariato.

Revisioni/REST: hook dinamici `rest_insert_{post_type}` e `rest_after_insert_{post_type}` catturano lo stato precedente, eseguono l'eventuale copy-once WPML e notificano un cambiamento effettivo. Il restore revisioni riporta insieme i meta solo se il marker è valido.

## Entry point REST, AJAX, hook, cron e CLI

Non esistono route REST custom: il contratto remoto è il meta schema delle route core dei post type abilitati. Non esistono endpoint AJAX, cron, shortcode o comandi WP-CLI.

Hook WordPress principali: `init` registra meta e hook REST dinamici; `enqueue_block_editor_assets`, `add_meta_boxes`, `admin_enqueue_scripts` e `save_post` gestiscono gli editor; `post_thumbnail_html` gestisce il frontend; filtri/action WooCommerce e WPML sono registrati solo a integrazione attiva.

API e extension hook pubblici: filtro `corsivo_focal_point_post_types`; action `corsivo_focal_point_position_updated`; action diagnostica `corsivo_focal_point_failure`. Funzioni riusabili: `corsivo_focal_point_get_state()`, `corsivo_focal_point_get_position_array()`, `corsivo_focal_point_get_position()` e `corsivo_focal_point_update_position()`.

## Admin, editor e frontend

Impostazioni → Focal Point elenca solo post type con UI e supporto thumbnail; `product` non è selezionabile direttamente e passa dal toggle WooCommerce. La pagina espone anche WPML copy-once e cleanup alla disinstallazione.

Nel block editor il pannello è document-level. Nel classic editor il meta box laterale riusa componenti WordPress; notice transitorie segnalano cambio attachment, fallimento scrittura o restore incompleto. Sul frontend non vengono caricati CSS o JavaScript: lo stile è inline sul primo `img` del markup filtrato.

## Integrazioni

WooCommerce, se abilitato e attivo, aggiunge `product` ai post type gestiti. Il filtro viene applicato alle immagini di catalogo, alla sola immagine principale della gallery classica e al blocco `woocommerce/product-image`. Le gallery dei prodotti variabili vengono saltate perché WooCommerce sostituisce la sorgente mantenendo gli stili.

WPML, se abilitato, cerca l'unica traduzione originale del TRID. Una traduzione senza coordinate riceve una sola volta x/y della sorgente, associandole però alla propria featured image; poi resta indipendente. La copia viene tentata su save, cambio `_thumbnail_id`, REST e traduzione automatica completata. `wpml-config.xml` imposta i meta su `ignore` per evitare sincronizzazioni generiche successive.

## Sicurezza, concorrenza ed error handling

Ogni scrittura editoriale verifica `edit_post`; la pagina impostazioni richiede `manage_options`; il classic editor verifica nonce e rifiuta payload non scalari. La scrittura coordinata conserva lo snapshot raw dei meta, deduplica, rilegge e tenta rollback. Non usa lock DB: protegge coerenza interna e cambio featured image, ma due salvataggi realmente concorrenti restano soggetti all'ordine delle write WordPress.

Gli errori applicativi vengono serializzati nell'error log e inviati a `corsivo_focal_point_failure`. I salvataggi UI mostrano notice best-effort. Il frontend fallisce aperto sul markup originale se post, stato, attachment o tag `img` non sono utilizzabili.

## Configurazione

L'option predefinita abilita soltanto `post`. Il filtro `corsivo_focal_point_post_types` consente ai site plugin di aggiungere CPT, ma il risultato finale deve esistere e supportare thumbnail. WooCommerce, WPML e cancellazione dati sono opt-in. L'header `Update URI` punta a `https://plugins.corsivo.dev/corsivo-focal-point`.

## Build, lingue e test

La build editoriale è autonoma:

```sh
cd admin-app
npm install
npm run check
```

`admin-app/build` contiene le due entry, i manifest e le varianti CSS LTR/RTL. `assets/editor.js`, `assets/classic-editor.js` e `assets/editor.css` restano fallback runtime. Il working tree non contiene `.po`, `.mo`, `.pot` o JSON di traduzione; `wp_set_script_translations()` usa il text domain, ma non c'è un catalogo locale distribuito.

Con plugin attivo e WordPress caricato:

```sh
wp eval-file wp-content/plugins/corsivo-focal-point/tests/smoke.php
```

Lo smoke copre sanitizzazione, rendering HTML, schema REST, deduplica/rollback, autosave, integrità e restore revisioni, WPML copy-once e diagnostica. Crea contenuti temporanei e fallisce con `RuntimeException` se trova errori. `.distignore` esclude `tests/` dal pacchetto.

## Extension point

Il filtro `corsivo_focal_point_post_types` è il punto corretto per abilitare CPT di progetto. Per template con background o markup non prodotto da `post_thumbnail_html`, usare le funzioni getter e applicare esplicitamente la stringa restituita. Per scritture programmatiche usare `corsivo_focal_point_update_position()` e, se il consumer deve reagire, emettere o ascoltare `corsivo_focal_point_position_updated` rispettando lo stato precedente.

## Limiti reali

Il plugin non genera crop e non modifica Open Graph/Twitter. Interviene solo sul primo `img` del markup filtrato. Il restore non ripristina la featured image. Il fallback WPML è copy-once, non sincronizzazione continua. Il cleanup globale dei meta può essere costoso su database grandi ed è eseguito solo in uninstall esplicito. La documentazione Apache in `.htaccess` protegge dotfile/archivi solo su server che la interpretano.

## Inventario file

- `README.md` — contratto operativo corrente di dati focal point, editor, rendering, integrazioni e inventario.
- `.distignore` — esclusioni del pacchetto, inclusi test e file di sviluppo.
- `.gitignore` — esclusione degli ZIP locali.
- `.htaccess` — regole Apache per negare dotfile, archivi e artefatti sensibili.
- `corsivo-focal-point.php` — header, costanti, require e activation hook.
- `changelog.txt` — storia delle release fino alla 1.2.2.
- `LICENSE` — testo GPL-2.0.
- `uninstall.php` — cleanup opt-in, multisite e verificato.
- `wpml-config.xml` — policy WPML `ignore` per i meta focal point.
- `includes/settings.php` — default, sanitizzazione, Settings API, pagina admin e attivazione multisite.
- `includes/data.php` — post type, meta, API pubbliche, scrittura coordinata, revisioni e autosave.
- `includes/editor.php` — block/classic editor, nonce, asset, REST lifecycle e notice.
- `includes/frontend.php` — riscrittura `object-position` con Tag Processor.
- `includes/integrations.php` — WooCommerce e WPML copy-once.
- `admin-app/package.json` e `package-lock.json` — pipeline privata e dipendenza locale da Corsivo UI.
- `admin-app/src/editor.js` — pannello Gutenberg con `FocalPointControl`.
- `admin-app/src/classic-editor.js` — editor classic, cache per attachment e MutationObserver.
- `admin-app/src/focal-point-adapter.js` — conversione controllata `0–1` ↔ storage `0–100`.
- `admin-app/build/` — bundle, manifest e CSS LTR/RTL distribuiti.
- `assets/editor.js` — fallback Gutenberg legacy.
- `assets/classic-editor.js` — fallback classic legacy.
- `assets/editor.css` — minime correzioni layout condivise dai due editor.
- `tests/smoke.php` — smoke WP-CLI end-to-end.
- `tests/admin-assets-smoke.php` — gate build, manifest, dipendenze e RTL.

Non sono presenti `node_modules/`, `vendor/` o `libs/tcpdf/`; non ci sono dipendenze terze da raggruppare.
