import { Notice } from '@wordpress/components';
import {
	createRoot,
	render,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { FocalPointControl } from '@corsivo-suite/wp-admin-ui/focal-point-control';
import '@corsivo-suite/wp-admin-ui/styles.css';
import './editor.css';
import {
	clampStoredCoordinate,
	toControlValue,
	toStoredPosition,
} from './focal-point-adapter';

const config = window.corsivoFocalPointClassicEditor || {};
const featuredImageEvent = 'corsivo-focal-point-featured-image-change';

const getAttachmentId = ( value ) => {
	const attachmentId = Number( value );

	return Number.isInteger( attachmentId ) && attachmentId > 0
		? attachmentId
		: 0;
};

const createPositionCache = ( {
	storedState,
	storedAttachmentId,
	initialAttachmentId,
	initialPosition,
	persistFallback,
} ) => {
	const positionCache = new Map();

	if (
		storedState.has_position &&
		storedState.has_attachment_link &&
		storedAttachmentId
	) {
		positionCache.set( storedAttachmentId, {
			position: {
				x: clampStoredCoordinate( storedState.x ),
				y: clampStoredCoordinate( storedState.y ),
			},
			hasChanges: false,
		} );
	}

	if ( initialAttachmentId ) {
		positionCache.set( initialAttachmentId, {
			position: initialPosition,
			hasChanges: persistFallback,
		} );
	}

	return positionCache;
};

const ClassicFocalPointPicker = ( { node } ) => {
	const fallbackPosition = useMemo(
		() => ( {
			x: clampStoredCoordinate( node.dataset.fallbackX ),
			y: clampStoredCoordinate( node.dataset.fallbackY ),
		} ),
		[ node ]
	);
	const persistFallback = node.dataset.persistFallback === '1';
	const initialAttachmentId = getAttachmentId( node.dataset.attachmentId );
	const storedState = config.initialState || {};
	const storedAttachmentId = getAttachmentId( storedState.attachment_id );
	const initialPosition = useMemo(
		() => ( {
			x: clampStoredCoordinate( node.dataset.x ),
			y: clampStoredCoordinate( node.dataset.y ),
		} ),
		[ node ]
	);
	const [ featuredImage, setFeaturedImage ] = useState( {
		attachmentId: initialAttachmentId,
		url: node.dataset.url || '',
	} );
	const [ position, setPosition ] = useState( initialPosition );
	const [ hasChanges, setHasChanges ] = useState(
		persistFallback && initialAttachmentId > 0
	);
	const [ positionCache ] = useState( () =>
		createPositionCache( {
			storedState,
			storedAttachmentId,
			initialAttachmentId,
			initialPosition,
			persistFallback,
		} )
	);

	useEffect( () => {
		const handleFeaturedImageChange = ( event ) => {
			const attachmentId = getAttachmentId( event.detail?.attachmentId );
			const url = event.detail?.url || '';

			if ( attachmentId === featuredImage.attachmentId ) {
				if ( url !== featuredImage.url ) {
					setFeaturedImage( { attachmentId, url } );
				}
				return;
			}

			if ( featuredImage.attachmentId ) {
				positionCache.set( featuredImage.attachmentId, {
					position,
					hasChanges,
				} );
			}

			const cached = positionCache.get( attachmentId );

			setFeaturedImage( { attachmentId, url } );
			setPosition( cached?.position || fallbackPosition );
			setHasChanges(
				cached ? cached.hasChanges : persistFallback && attachmentId > 0
			);
		};

		node.addEventListener( featuredImageEvent, handleFeaturedImageChange );

		return () =>
			node.removeEventListener(
				featuredImageEvent,
				handleFeaturedImageChange
			);
	}, [
		fallbackPosition,
		featuredImage,
		hasChanges,
		node,
		persistFallback,
		position,
		positionCache,
	] );

	const updatePosition = ( focalPoint ) => {
		setPosition( toStoredPosition( focalPoint ) );
		setHasChanges( true );
	};

	if ( ! featuredImage.attachmentId ) {
		return (
			<p className="description">
				{ __(
					'Imposta un’immagine in evidenza per configurare il focal point.',
					'corsivo-focal-point'
				) }
			</p>
		);
	}

	if ( ! featuredImage.url ) {
		return (
			<Notice status="warning" isDismissible={ false }>
				{ __(
					'L’anteprima dell’immagine non è disponibile.',
					'corsivo-focal-point'
				) }
			</Notice>
		);
	}

	return (
		<>
			<FocalPointControl
				className="corsivo-focal-point-picker"
				label={ __( 'Punto focale', 'corsivo-focal-point' ) }
				url={ featuredImage.url }
				value={ toControlValue( position ) }
				onChange={ updatePosition }
				resetLabel={ __(
					'Reimposta al centro',
					'corsivo-focal-point'
				) }
			/>
			{ hasChanges && (
				<>
					<input
						type="hidden"
						name={ config.metaX }
						value={ position.x }
					/>
					<input
						type="hidden"
						name={ config.metaY }
						value={ position.y }
					/>
					<input
						type="hidden"
						name={ config.metaAttachment }
						value={ featuredImage.attachmentId }
					/>
				</>
			) }
		</>
	);
};

document
	.querySelectorAll( '.corsivo-focal-point-classic' )
	.forEach( ( node ) => {
		const component = <ClassicFocalPointPicker node={ node } />;

		if ( createRoot ) {
			createRoot( node ).render( component );
			return;
		}

		render( component, node );
	} );

const featuredImageBox = document.getElementById( 'postimagediv' );
const classicNodes = document.querySelectorAll(
	'.corsivo-focal-point-classic'
);

if ( featuredImageBox && classicNodes.length ) {
	let animationFrame = 0;
	let previousSignature = '';
	const notifyFeaturedImageChange = () => {
		window.cancelAnimationFrame( animationFrame );
		animationFrame = window.requestAnimationFrame( () => {
			const input = document.getElementById( '_thumbnail_id' );
			const image = featuredImageBox.querySelector(
				'#set-post-thumbnail img'
			);
			const attachmentId = getAttachmentId( input?.value );
			const url = image?.currentSrc || image?.getAttribute( 'src' ) || '';
			const signature = `${ attachmentId }:${ url }`;

			if ( signature === previousSignature ) {
				return;
			}

			previousSignature = signature;
			classicNodes.forEach( ( node ) => {
				node.dispatchEvent(
					new CustomEvent( featuredImageEvent, {
						detail: { attachmentId, url },
					} )
				);
			} );
		} );
	};
	const observer = new window.MutationObserver( notifyFeaturedImageChange );

	observer.observe( featuredImageBox, {
		attributes: true,
		childList: true,
		subtree: true,
	} );
	notifyFeaturedImageChange();
}
