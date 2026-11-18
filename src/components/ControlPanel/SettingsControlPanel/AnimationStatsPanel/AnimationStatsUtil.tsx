import { nanoid } from "nanoid";
import { AnimationBoundingShape, MovementDirection } from "../../../../state-management/models/AnimationStats";

export const BuildAnimationBoundingShapeText = (boundingShapes: Map<AnimationBoundingShape, string> | null) => {
    const autoGen = [];
    if(boundingShapes != null) {
       boundingShapes.forEach((entry, key) => autoGen.push(<option key={nanoid()} value={key}>{entry}</option>))
    }
    return autoGen;
}

export const BuildAnimationStatsDirectionText = (directions: Map<MovementDirection, string> | null) => {
    const autoGen = [];
    if(directions != null) {
        directions.forEach((entry, key) =>  autoGen.push(<option key={nanoid()} value={key}>{entry}</option>))
    }
    return autoGen;
}