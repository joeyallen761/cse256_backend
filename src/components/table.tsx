import React from "react";
import { connect, ConnectedProps } from 'react-redux'
import {
    Data,
    RootState,
    StudentProjectIteration,
    updateSubmitHITData,
    updateSPIData,
    SubmitHITDataType
} from "../redux/actions";
const csvp = require('csv-parse');

const mapState = (state: RootState) => {
    return {
        currentProject: state.currentProject,
        currentIteration: state.currentIteration,
        spiData: state.spiData,
        students: state.students,
        submitHITData: state.submitHITData
    }
};

const mapDispatchToProps = {
    updateSPIData,
    updateSubmitHITData
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type State = {
    input: string;
    displayTable: boolean;
    compiler: Compiler;
}

type Condition = (input: string[]) => boolean;

function createCond(index: number, value: string) {
    return (input: string[]) => input[index] === value;
}

class Compiler {

    private static instance = new Compiler();

    private data: Data | null;
    private filterExpr: string | null;

    constructor() {
        this.data = null;
        this.filterExpr = null;
    }

    setData(data: Data | null) {
        this.data = data;
        return this;
    }

    setFilterExpression(expr: string | null) {
        this.filterExpr = expr;
        return this;
    }

    static I() {
        return Compiler.instance;
    }

    private lex() {
        if (this.filterExpr === null) {
            throw new Error('filter expression has not been set yet, therefore lex cannot be called yet');
        }
        return this
            .filterExpr
            .trim()
            .split(' ')
            .map(tok => tok.trim())
            .filter(tok => tok !== '');
    }

    private key(k: string) {
        if (this.data === null) {
            throw new Error('data has not been set yet, therefore key cannot be called yet');
        }
        if (k === '&&' || k === '==') {
            throw new Error('invalid key supplied (special symbol was provided instead of a key)');
        }
        const ind = this.data.header.indexOf(k);
        console.log(k, ind);
        if (ind === -1) {
            throw new Error('invalid key supplied');
        }
        return ind;
    }

    private eq(k: string) {
        if (k !== '==') {
            throw new Error('invalid equality detected');
        }
    }

    private value(k: string) {
        if (k === '&&' || k === '==') {
            throw new Error('invalid value supplied (special symbol was provided instead of a value)');
        }
        return k;
    }

    private amper(k: string) {
        if (k !== '&&') {
            throw new Error('invalid expression connector detected');
        }
    }

    private parse(tokens: string[]): Condition[] {
        if (tokens.length < 3) {
            throw new Error('cannot parse expression with less than 3 tokens')
        }
        if (tokens.length % 2 !== 1) {
            throw new Error('cannot parse expression with even number of tokens');
        }
        let conds: Condition[] = [];
        let ind = -1;
        let val = '';
        tokens.forEach((tok, i) => {
            switch (i % 4) {
                case 0:
                    ind = this.key(tok);
                    break;
                case 1:
                    this.eq(tok);
                    break;
                case 2:
                    val = this.value(tok);
                    conds.push(createCond(ind, val));
                    break;
                case 3:
                    this.amper(tok);
                    break;
                default:
                    throw new Error('i dont know how i got here, and should not have');
            }

        });
        return conds;
    }

    private evaluate(conditions: Condition[]): string[][] {
        if (this.data === null) {
            throw new Error('data is null, cannot evaluate a an expression without any data')
        }
        const ret = this.data.values.filter(row => {
            return conditions.map(cond => cond(row)).every(cond => cond);
        });
        return ret;
    }

    execute (): string[][] {
        return this.evaluate(this.parse(this.lex()));
    }
}

class Table extends React.Component<Props, State> {

    private fileInput = React.createRef<HTMLInputElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            input: '',
            displayTable: false,
            compiler: new Compiler().setData(this.props.submitHITData.data)
        };
    }

    updateCSVData(csv: string[][]) {
        let header: string[] = [];
        let values: string[][] = [];
        try {
            if (csv.length >= 2) {
                header = csv[0];
                values = csv.slice(1);
            }
        } catch (e) {
            alert(e);
            header = [];
            values = [];
        }
        let dt = undefined;
        if (
            header.length === 3 &&
            ['WUSTL Key', 'Task Tag', 'Count'].every(hk => header.includes(hk))
        ) {
            this.props.updateSubmitHITData({dataType: SubmitHITDataType.COUNT_GIVEN, data: new Data(header, values)});
        } else if (
            header.length === 4 &&
            ['WUSTL Key', 'Task 1', 'Task 2', 'Task 3'].every(hk => header.includes(hk))
        ) {
            this.props.updateSubmitHITData({dataType: SubmitHITDataType.COUNT_NOT_GIVEN, data: new Data(header, values)});
        } else {
            alert('CSV is in invalid format. Cannot load the given file.')
        }
    }

    renderFileInput() {
            return (
                <form>
                    <input
                        ref={this.fileInput}
                        type={"file"}
                        accept={"text/csv"}
                        className={"input-file"}
                        name={"csv-input"}
                        id={"csv-input"}
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
                        htmlFor={"csv-input"}
                    >
                        Input File of HIT Assignments here...
                    </label>
                </form>
            );
    }
    render() {
        let dispData = [];
        console.log(this.props.submitHITData)
        console.log(this.props.submitHITData.data)
        console.log(this.props.submitHITData.dataType)
        try {
            dispData = this.state.compiler.setData(this.props.submitHITData.data).execute();
        } catch (e) {
            // console.log(e);
            dispData = this.props.submitHITData.data.values;
        }
        return (
            <div className={"status-container"}>
                {this.renderFileInput()}
                <input
                    type={"text"}
                    value={this.state.input}
                    className={"filter-input"}
                    onChange={ev => {
                        this.state.compiler.setFilterExpression(ev.target.value);
                        this.setState({input: ev.target.value});
                    }}
                    placeholder={"Enter your data filter expression here..."}
                />
                <DataTable data={new Data(this.props.submitHITData.data.header, dispData)} />
            </div>
        );
    }

}

export class DataTable extends React.Component<{data: Data}, any> {

    render() {
        if (this.props.data === undefined || this.props.data === null || this.props.data.header.length === 0) {
            return (
                <div>
                    <h2> No data to display. </h2>
                </div>
            );
        }
        return <table className={"hit-data"}>
            <thead>
            <tr>
                {
                    this
                        .props
                        .data
                        .header
                        .map((key, index) => <th key={key+index}>{key}</th>)
                }
            </tr>
            </thead>
            <tbody>
            {
                this
                    .props
                    .data
                    .values
                    .map((row, index) =>
                        <tr key={index}>
                            {
                                row
                                    .map((val, index) => <td key={val+index}>{val}</td>)
                            }
                        </tr>
                    )
            }
            </tbody>
        </table>
    }

}

export default connector(Table);
