import React from "react";
import {Data, RootState, updateMTurkMode} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import {DataTable} from "./table";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";
import MTPool from "../aws/mturk";
import {SandboxToggle} from "./toggle";

const csvp = require('csv-parse');

export const mapState = (state: RootState) => {
    return {
        projects: state.projects,
        iterations: state.iterations,
        currentProject: state.currentProject,
        currentIteration: state.currentIteration,
        spiData: state.spiData,
        submitHITData: state.submitHITData,
        students: state.students,
        mturkMode: state.mturkMode,
    };
};

export const mapDispatchToProps = {
    updateMTurkMode,
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type State = BWDState & {
    data: Data,
}

class PayHits extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH,
            data: new Data([], []),
        };
    }

    updateCSVData(data: string[][]) {
        this.setState({data: new Data(data[0], data.slice(1))});
    }

    renderFileInput() {
        return (
            <form>
                <input
                    //ref={this.fileInput}
                    type={"file"}
                    accept={"text/csv"}
                    className={"input-file"}
                    name={"csv-input-1"}
                    id={"csv-input-1"}
                    onChange={event => {
                        const file = event.target.files?.item(0);
                        if (file) {
                            const fr = new FileReader();
                            fr.onloadend = () => {
                                if (fr.readyState === FileReader.DONE) {
                                    csvp(fr.result, {}, (err: any, out: string[][]) => {
                                        if (err) {
                                            alert(`Could not parse file correctly. Error: ${err}.`)
                                        } else {
                                            this.updateCSVData(out);
                                        }
                                    });
                                }
                            };
                            fr.readAsText(file, 'utf-8');
                        }
                    }}
                />
                <label
                    className={"csv-input"}
                    htmlFor={"csv-input-1"}
                >
                    Input File of HIT Payments here...
                </label>
            </form>
        );
    }

    render() {
        return (
            <div>
                {this.renderFileInput()}
                <SandboxToggle />
                <ButtonWithDescription
                    buttonTitle={'Pay'}
                    description={'Resolves all of the HITs listed with the action that is provided for it. Valid actions are: approve, bonus, and reject.'}
                    buttonClass={'safe'}
                    onClick={async () => {
                        try {
                            this.setState({loadingStatus: LoadingState.LOADING, errorString: undefined});
                            await MTPool.payHits(this.state.data, this.props.mturkMode);
                            this.setState({loadingStatus: LoadingState.SUCCESS, errorString: undefined});
                        } catch (e) {
                            this.setState({loadingStatus: LoadingState.ERROR, errorString: e.toString()});
                        }
                    }}
                    display={true}
                    loadingState={this.state.loadingStatus}
                    error={this.state.errorString}
                />
                {this.state.data.values.length === 0 ? null : <DataTable data={this.state.data} />}
            </div>
        );
    }
}

export default connector(PayHits);