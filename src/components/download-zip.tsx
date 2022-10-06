import React from "react";
import {downloadAllFiles} from "../aws/aws-service";
import {RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";

export const mapState = (state: RootState) => {
    return {
        currentIteration: state.currentIteration,
        currentProject: state.currentProject
    };
};

export const mapDispatchToProps = {};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type State = BWDState & {

}

export default connector(class DownloadZip extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
          loadingStatus: LoadingState.FRESH,
        };
    }

    async download(iteration: number) {
        try {
            this.setState({loadingStatus: LoadingState.LOADING, errorString: undefined});
            const zipData = await downloadAllFiles(this.props.currentProject.Name, iteration);
            if ('s3Key' in zipData && 'localFileName' in zipData) {
                // https://davidwalsh.name/javascript-download
                const a = document.createElement("a");
                a.style.display = "none";
                document.body.appendChild(a);

                a.href = zipData.s3Key;

                // Use download attribute to set set desired file name
                a.setAttribute("download", zipData.localFileName);

                // Trigger the download by simulating click
                a.click();

                // Cleanup
                window.URL.revokeObjectURL(a.href);
                document.body.removeChild(a);
                this.setState({loadingStatus: LoadingState.SUCCESS});
            } else {
                this.setState({loadingStatus: LoadingState.ERROR, errorString: 'Error while downloading files: ' + JSON.stringify(zipData)});
            }
        } catch (e){
            this.setState({loadingStatus: LoadingState.ERROR, errorString: `An error occurred during the download: ${e.toString()}`});
        }
    }

    render() {
        return (
            <div>
                <ButtonWithDescription
                    buttonTitle={`Download All Logs for ${this.props.currentProject.Name} project, iteration ${this.props.currentIteration}.`}
                    description={'Downloads all logs for the currently selected project and iteration. This is meant for collecting logs for hits following a successful HIT deployment to MTurk.'}
                    buttonClass={'safe'}
                    onClick={() => this.download(this.props.currentIteration)}
                    display={true}
                    loadingState={this.state.loadingStatus}
                    error={this.state.errorString}
                />
            </div>
        );
    }
});