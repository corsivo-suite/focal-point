<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

$assertions = 0;
$assert     = static function ( $condition, $message ) use ( &$assertions ) {
	++$assertions;

	if ( ! $condition ) {
		throw new RuntimeException( $message );
	}
};

foreach ( array( 'editor', 'classic-editor' ) as $entry ) {
	$asset = corsivo_focal_point_admin_build_asset( $entry );

	$assert( is_array( $asset ), "Build asset {$entry} non disponibile." );
	$assert( ! empty( $asset['dependencies'] ), "Dipendenze {$entry} mancanti." );
	$assert( ! empty( $asset['version'] ), "Versione {$entry} mancante." );
	$assert( str_ends_with( $asset['script_url'], "/{$entry}.js" ), "Script URL {$entry} non valido." );
	$assert( str_ends_with( $asset['style_url'], "/{$entry}.css" ), "Style URL {$entry} non valido." );
	$assert( in_array( 'react-jsx-runtime', $asset['dependencies'], true ), "Runtime JSX {$entry} non dichiarato." );
}

$assert( null === corsivo_focal_point_admin_build_asset( 'missing' ), 'Il gate accetta una build incompleta.' );
$assert( is_readable( CORSIVO_FOCAL_POINT_PATH . 'assets/editor.js' ), 'Fallback block editor mancante.' );
$assert( is_readable( CORSIVO_FOCAL_POINT_PATH . 'assets/classic-editor.js' ), 'Fallback classic editor mancante.' );
$assert( is_readable( CORSIVO_FOCAL_POINT_PATH . 'assets/editor.css' ), 'Fallback CSS mancante.' );

$script_handle = 'corsivo-focal-point-asset-test';

corsivo_focal_point_enqueue_editor_bundle(
	'editor',
	$script_handle,
	'assets/editor.js',
	array( 'wp-components' )
);

$registered_script = wp_scripts()->registered[ $script_handle ] ?? null;
$registered_style  = wp_styles()->registered['corsivo-focal-point-editor'] ?? null;

$assert( $registered_script instanceof _WP_Dependency, 'Bundle editor non registrato.' );
$assert( str_ends_with( $registered_script->src, '/admin-app/build/editor.js' ), 'Il bundle editor usa il fallback nonostante la build completa.' );
$assert( in_array( 'react-jsx-runtime', $registered_script->deps, true ), 'Dipendenza JSX runtime non accodata.' );
$assert( $registered_style instanceof _WP_Dependency, 'CSS Corsivo UI non registrato.' );
$assert( 'replace' === ( $registered_style->extra['rtl'] ?? null ), 'CSS RTL non configurato in replace.' );

wp_dequeue_script( $script_handle );
wp_deregister_script( $script_handle );
wp_dequeue_style( 'corsivo-focal-point-editor' );
wp_deregister_style( 'corsivo-focal-point-editor' );

echo "Corsivo Focal Point admin assets: {$assertions} assertions passed.\n";
