export const clampStoredCoordinate = ( value ) => {
	const coordinate = Number( value );

	if ( ! Number.isFinite( coordinate ) ) {
		return 50;
	}

	return Math.max( 0, Math.min( 100, Math.round( coordinate ) ) );
};

export const toControlValue = ( position ) => ( {
	x: clampStoredCoordinate( position?.x ) / 100,
	y: clampStoredCoordinate( position?.y ) / 100,
} );

export const toStoredPosition = ( focalPoint ) => ( {
	x: clampStoredCoordinate( Number( focalPoint?.x ) * 100 ),
	y: clampStoredCoordinate( Number( focalPoint?.y ) * 100 ),
} );
