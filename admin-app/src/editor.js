import { Notice, Spinner } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { FocalPointControl } from '@corsivo-suite/wp-admin-ui/focal-point-control';
import '@corsivo-suite/wp-admin-ui/styles.css';
import './editor.css';
import {
	clampStoredCoordinate,
	toControlValue,
	toStoredPosition,
} from './focal-point-adapter';

const config = window.corsivoFocalPointEditor || {};

const getPreviewUrl = ( media ) => {
	if ( ! media ) {
		return '';
	}

	const sizes = media.media_details?.sizes || {};

	return (
		sizes.medium_large?.source_url ||
		sizes.medium?.source_url ||
		media.source_url ||
		''
	);
};

const FocalPointPanel = () => {
	const { meta, featuredId } = useSelect(
		( select ) => ( {
			meta:
				select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {},
			featuredId:
				select( 'core/editor' ).getEditedPostAttribute(
					'featured_media'
				) || 0,
		} ),
		[]
	);
	const { media, mediaResolutionFinished } = useSelect(
		( select ) => {
			if ( ! featuredId ) {
				return { media: null, mediaResolutionFinished: true };
			}

			const query = [ 'postType', 'attachment', featuredId ];
			const core = select( 'core' );

			return {
				media: core.getEntityRecord( ...query ),
				mediaResolutionFinished: core.hasFinishedResolution(
					'getEntityRecord',
					query
				),
			};
		},
		[ featuredId ]
	);
	const { editPost } = useDispatch( 'core/editor' );
	const initialState = config.initialState || {};
	const sourcePosition = config.sourcePosition || {};
	const storedAttachmentId = Number( meta[ config.metaAttachment ] ) || 0;
	const initialAttachmentId = Number( initialState.attachment_id ) || 0;
	let storedPosition = { x: 50, y: 50 };

	if ( featuredId && storedAttachmentId === featuredId ) {
		storedPosition = {
			x: clampStoredCoordinate( meta[ config.metaX ] ),
			y: clampStoredCoordinate( meta[ config.metaY ] ),
		};
	} else if (
		initialState.has_position &&
		initialAttachmentId === featuredId
	) {
		storedPosition = {
			x: clampStoredCoordinate( initialState.x ),
			y: clampStoredCoordinate( initialState.y ),
		};
	} else if ( ! initialState.has_position && config.sourcePosition ) {
		storedPosition = {
			x: clampStoredCoordinate( sourcePosition.x ),
			y: clampStoredCoordinate( sourcePosition.y ),
		};
	}

	const commitPosition = useCallback(
		( focalPoint ) => {
			const nextPosition = toStoredPosition( focalPoint );

			editPost( {
				meta: {
					[ config.metaX ]: nextPosition.x,
					[ config.metaY ]: nextPosition.y,
					[ config.metaAttachment ]: featuredId,
				},
			} );
		},
		[ editPost, featuredId ]
	);
	const panelProps = {
		name: 'corsivo-focal-point',
		title: __( 'Focal Point', 'corsivo-focal-point' ),
		icon: 'visibility',
	};

	if ( ! featuredId ) {
		return (
			<PluginDocumentSettingPanel { ...panelProps }>
				<p className="description">
					{ __(
						'Imposta un’immagine in evidenza per configurare il focal point.',
						'corsivo-focal-point'
					) }
				</p>
			</PluginDocumentSettingPanel>
		);
	}

	if ( ! mediaResolutionFinished ) {
		return (
			<PluginDocumentSettingPanel { ...panelProps }>
				<Spinner />
			</PluginDocumentSettingPanel>
		);
	}

	const previewUrl = getPreviewUrl( media );

	if ( ! previewUrl ) {
		return (
			<PluginDocumentSettingPanel { ...panelProps }>
				<Notice status="warning" isDismissible={ false }>
					{ __(
						'L’anteprima dell’immagine non è disponibile.',
						'corsivo-focal-point'
					) }
				</Notice>
			</PluginDocumentSettingPanel>
		);
	}

	return (
		<PluginDocumentSettingPanel { ...panelProps }>
			<FocalPointControl
				className="corsivo-focal-point-picker"
				label={ __( 'Punto focale', 'corsivo-focal-point' ) }
				url={ previewUrl }
				value={ toControlValue( storedPosition ) }
				onChange={ commitPosition }
				resetLabel={ __(
					'Reimposta al centro',
					'corsivo-focal-point'
				) }
			/>
		</PluginDocumentSettingPanel>
	);
};

registerPlugin( 'corsivo-focal-point', {
	render: FocalPointPanel,
	icon: 'visibility',
} );
