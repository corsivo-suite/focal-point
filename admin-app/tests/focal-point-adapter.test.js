import {
	clampStoredCoordinate,
	toControlValue,
	toStoredPosition,
} from '../src/focal-point-adapter';

describe( 'focal point adapter', () => {
	it( 'clamps persisted integer coordinates', () => {
		expect( clampStoredCoordinate( -4 ) ).toBe( 0 );
		expect( clampStoredCoordinate( 42.6 ) ).toBe( 43 );
		expect( clampStoredCoordinate( 104 ) ).toBe( 100 );
		expect( clampStoredCoordinate( 'invalid' ) ).toBe( 50 );
	} );

	it( 'converts stored percentages to controlled coordinates', () => {
		expect( toControlValue( { x: 25, y: 80 } ) ).toEqual( {
			x: 0.25,
			y: 0.8,
		} );
	} );

	it( 'converts controlled coordinates without changing storage shape', () => {
		expect( toStoredPosition( { x: 0.257, y: 0.804 } ) ).toEqual( {
			x: 26,
			y: 80,
		} );
	} );
} );
