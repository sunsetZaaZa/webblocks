export type AnimationStats = {
    xInterval: number;
    yInterval: number;
    directionOne: MovementDirection,
    directionTwo: MovementDirection,
    boundingBox: AnimationBoundingBox | null,
    rotateDegree: number,
    xRate: number;
    yRate: number;
}

export type AnimationBoundingBox = {
    xBound: number;
    yBound: number;
    xOrigin: number;
    yOrigin: number;
    shape: AnimationBoundingShape
}

export enum AnimationBoundingShape {
    triangle = 2,
    square = 3,
    rectangle = 4,
    trapizod = 5,
    hexagon = 6
}

export const AnimationBoundingShapeText = new Map<AnimationBoundingShape, string>([
    [AnimationBoundingShape.triangle, 'Triangle'],
    [AnimationBoundingShape.square, 'Square'],
    [AnimationBoundingShape.rectangle, 'Rectangle'],
    [AnimationBoundingShape.trapizod, 'Trapizod'],
    [AnimationBoundingShape.hexagon, 'Hexagon']
])

export enum MovementDirection {
    static = 0,
    up = 1,
    down = 2,
    right = 3,
    left = 4,
}

export const MovementDirectionText = new Map<MovementDirection, string>([
    [MovementDirection.static, 'Static'],
    [MovementDirection.up, 'Up'],
    [MovementDirection.down, 'Down'],
    [MovementDirection.right, 'Right'],
    [MovementDirection.left, 'Left']
])

export enum MovementFineDirection {
    up = 1,
    upRight = 2,
    right = 3,
    rightDown = 4,
    down = 5,
    leftDown = 6,
    left = 7,
    upLeft = 8
}

export const MovementFineDirectionText = new Map<MovementFineDirection, string>([
    [MovementFineDirection.up, 'Upward'],
    [MovementFineDirection.upRight, 'Upward Right'],
    [MovementFineDirection.right, 'Right'],
    [MovementFineDirection.rightDown, 'Downward Right'],
    [MovementFineDirection.down, 'Downward'],
    [MovementFineDirection.leftDown, 'Downward Left'],
    [MovementFineDirection.left, 'Left'],
    [MovementFineDirection.upLeft, 'Upward Left']
])