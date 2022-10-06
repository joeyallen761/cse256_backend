import React from "react";
import {DataTable} from "./table";
import {Data, RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";
import MTPool from "../aws/mturk";
import {SandboxToggle} from "./toggle";

export const mapState = (state: RootState) => {
    return {
        mturkMode: state.mturkMode
    };
};

export const mapDispatchToProps = {
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type State = BWDState & {
    data: Data,
}

class HitStatuses extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH,
            data: new Data([], []),
        };
    }

    render() {
        return (
            <div>
                <SandboxToggle />
                <ButtonWithDescription
                    buttonTitle={'Refresh'}
                    description={'Gets the current status of all HITs for all accounts.'}
                    buttonClass={'basic'}
                    onClick={async () => {
                        this.setState({loadingStatus: LoadingState.LOADING, errorString: undefined});
                        const data = await MTPool.getStatuses(this.props.mturkMode);
                        this.setState({data: data, loadingStatus: LoadingState.SUCCESS, errorString: undefined});
                    }}
                    display={true}
                    loadingState={this.state.loadingStatus}
                    error={this.state.errorString}
                />
                <DataTable data={this.state.data} />
            </div>
        );
    }
}

export default connector(HitStatuses);
