export default class Node {
	constructor(point, handleIn, handleOut) {
		this.point = point;
		this.handleIn = handleIn || point;
		this.handleOut = handleOut || point;
	}

	get x() {
		return this.point.x;
	}

	set x(x) {
		this.point.x = x;
	}

	get y() {
		return this.point.y;
	}

	set y(y) {
		this.point.y = y;
	}
}
