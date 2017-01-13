export function transform2D(viewMatrix, p) {
	const [a, b, c, d, tx, ty] = matrix;

	return {
		x: a * p.x + b * p.y + tx,
		y: c * p.x + d * p.y + ty,
	};
}

export function add2D(v1, v2) {
	return {
		x: v1.x + v2.x,
		y: v1.y + v2.y,
	};
}

export function subtract2D(v1, v2) {
	return {
		x: v1.x - v2.x,
		y: v1.y - v2.y,
	};
}

export function mulScalar2D(scalar, v) {
	return {
		x: scalar * v.x,
		y: scalar * v.y,
	};
}

