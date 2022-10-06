import React from "react";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";
import {getTable} from "../aws/db";
import {RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import MTPool from "../aws/mturk";

export const mapState = (state: RootState) => {
    return {
        currentIteration: state.currentIteration,
        currentProject: state.currentProject,
        mturkMode: state.mturkMode,
    };
};

export const mapDispatchToProps = {};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {

}

type State = BWDState & {
}

export default connector(class Disqualify extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH,
        };
    }

    render() {
        return (
            <div>
                <ButtonWithDescription
                    buttonTitle={'Disqualify'}
                    description={'Disqualifies all mturk workers from the previous iteration.'}
                    buttonClass={'info'}
                    onClick={async () => {
                        try {
                            this.setState({
                                loadingStatus: LoadingState.LOADING,
                                errorString: undefined,
                            });
                            const table = getTable();
                            if (table) {
                                const midfix = `/${this.props.currentProject.Name}/${this.props.currentIteration}/`;
                                console.log(midfix);
                                let idSet = new Set<string>();
                                const logs = table.getLogEntries(midfix);

                                const ids = (await logs).
                                    map(log => log.WorkerID).
                                    forEach(id => idSet.add(id));
                                console.log(idSet.size)
                                await MTPool.disqualify(this.props.mturkMode, this.props.currentProject.Name, idSet);
                                this.setState({loadingStatus: LoadingState.SUCCESS});
                            } else {
                                this.setState({
                                    loadingStatus: LoadingState.ERROR,
                                    errorString: `There is no table ready to be used.`,
                                });
                            }
                        } catch (e) {
                            this.setState({
                                loadingStatus: LoadingState.ERROR,
                                errorString: e.toString(),
                            });
                        }
                    }}
                    display={true}
                    loadingState={this.state.loadingStatus}
                    error={this.state.errorString}
                />
            </div>
        );
    }

});