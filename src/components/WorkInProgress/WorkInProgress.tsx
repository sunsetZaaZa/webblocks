import './WorkInProgress.scss'

export type WIPProps = {
    showUp: boolean;
}

export default function WorkInProgress(props: WIPProps) {
    const displayThis: string = props.showUp ? 'flex' : 'none';

    return(
        <span style={{display: displayThis}}>WORK IN PROGRESS</span>
    )
}