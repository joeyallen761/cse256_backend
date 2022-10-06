import React from "react";
import {RootState, updateStudents} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
const csvp = require('csv-parse');

export const mapState = (state: RootState) => {
    return {
        students: state.students
    };
};

export const mapDispatchToProps = {
    updateStudents
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

enum UploadStatus {
    NO_UPLOAD = 'No file has been uploaded yet.',
    SUCCESS = 'File has been successfully uploaded and parsed.',
    FAILURE = 'The file that was uploaded could not be parsed or did not validate.',
}

type State = {
    fileUploaded: UploadStatus;
}

export default connector(class StudentFileInput extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            fileUploaded: UploadStatus.NO_UPLOAD,
        }
    }

    validateStudents(values: string[][]): boolean {
        return values.length > 1
            && values[0][0].trim() === 'WUSTL Key'
            && values[0][1].trim() === 'GH Pages URL'
            && values[0][2].trim() === 'AWS IAM ID'
            && values[0][3].trim() === 'AWS IAM SECRET'
            && values.every(row => {
                return row.length === 4;
            });
    }

    render() {
        return (
            <div className={"student-file-input"}>
                <div>
                    <h3>
                        {this.state.fileUploaded}
                    </h3>
                    <FileInput onFileChange={(data: string[][]) => {
                        if (this.validateStudents(data)) {
                            this.props.updateStudents(
                                data
                                    .slice(1)
                                    .map(studData => {
                                        return {
                                            wustlKey: studData[0].trim(),
                                            url: studData[1].trim(),
                                            id: studData[2].trim(),
                                            secret: studData[3].trim(),
                                        };
                                    })
                            );
                            this.setState({fileUploaded: UploadStatus.SUCCESS});
                        } else {
                            this.setState({fileUploaded: UploadStatus.FAILURE});
                        }
                    }} />
                </div>
            </div>
        );
    }
});

type FileInputProps = {
    onFileChange: (values: string[][]) => any
}

export class FileInput extends React.Component<FileInputProps, {}> {

    private fileInput = React.createRef<HTMLInputElement>();

    render() {
        return (
                <form>
                    <input
                        ref={this.fileInput}
                        type={"file"}
                        accept={"text/csv"}
                        className={"input-file"}
                        name={"student-input"}
                        id={"student-input"}
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
                                                console.log(out);
                                                this.props.onFileChange(out);
                                            }
                                        });
                                    }
                                };
                                fr.readAsText(file, 'utf-8');
                            }
                       }}
                    />
                    <label
                        className={"student-input"}
                        htmlFor={"student-input"}
                    >
                        Input File of Student Credentials Here...
                    </label>
                </form>
        );
    }

}