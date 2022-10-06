import React from "react";
import {RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import MTPool from "../aws/mturk";
import {SandboxToggle} from "./toggle";
import ButtonWithDescription, {LoadingState} from "./button-with-description";

export const mapState = (state: RootState) => {
    return {
        projects: state.projects,
        iterations: state.iterations,
        currentProject: state.currentProject,
        currentIteration: state.currentIteration,
        spiData: state.spiData,
        students: state.students,
        mturkMode: state.mturkMode,
    };
};

export const mapDispatchToProps = {
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type State = {
    loadingState: LoadingState;
}

class CancelHits extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            loadingState: LoadingState.FRESH,
        };
    }

    render() {
        return (
            <div className={"status-container"}>
                <SandboxToggle />
                <ButtonWithDescription
                    buttonTitle={"Cancel"}
                    description={"Cancels all live hits for all individuals listed in the current credentials file."}
                    buttonClass={"status-update safe right"}
                    onClick={async () => {
                        this.setState({loadingState: LoadingState.LOADING});
                        await MTPool.cancelHits(this.props.mturkMode);
                        this.setState({loadingState: LoadingState.SUCCESS});
                    }}
                    display={true}
                    loadingState={this.state.loadingState}
                />
            </div>
        );
    }
}

export default connector(CancelHits);