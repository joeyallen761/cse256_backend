import React from "react";
import {Data, fetchSPIData, MTurkMode, RootState, SubmitHITDataType, updateMTurkMode} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import MTPool from "../aws/mturk";
import ButtonWithDescription, {LoadingState} from "./button-with-description";
import {SandboxToggle, Toggle} from "./toggle";
import Table, {DataTable} from "./table";

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

type State = {
    activeTable: number,
    price: string,
    errors: Data,
    loadingState: LoadingState,
}

class SubmitHits extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            activeTable: 0,
            price: '0.40',
            errors: new Data(['WUSTL Key', 'Error', 'Count'], []),
            loadingState: LoadingState.FRESH,
        };
    }

    getDiffData() {
        fetchSPIData();
        let values: string[][] = [];
        const ret = new Data(this.props.submitHITData.data.header, []);
        
        console.log("ret header", ret)
        //Access-Control-Allow-Origin: *
        try {
            const spiData = this.props.spiData;
            if (spiData !== null) {
                this.props.submitHITData.data.values.forEach(row => {
                    const studData = spiData[row[0]];
                    if (studData) {
                        const projData = studData[this.props.currentProject.Name];
                        if (projData) {
                            const iterData = projData[this.props.currentIteration];
                            if (iterData) {
                                const taskData = iterData.tasks.find(item => item.name === row[1]);
                                if (taskData) {
                                    values.push([
                                        row[0],
                                        row[1],
                                        '' + taskData.count
                                    ]);
                                    return;
                                }
                            }
                        }
                    }
                    values.push(row);
                });
            } else {
                values = this.props.submitHITData.data.values;
            }
            ret.values = values;
            return ret;
        } catch (e) {
            alert(e);
            return this.props.submitHITData.data;
        }
    }

    buildURL(wustlKey: string, url: string, taskTag: string) {
        console.log(this.props.currentIteration)
        return `${url}/?wustl_key=${wustlKey}&amp;sandbox=${this.props.mturkMode === MTurkMode.SANDBOX}&amp;project=${this.props.currentProject.Name}&amp;iteration=${this.props.currentIteration}&amp;tag=${taskTag}`;
    }

    async buildFromCountNotGiven(): Promise<{[wustlKey: string]: {count: number, url: string, price: string}[]}> {
        const hitData: {[key: string]: {count: number, url: string, price: string}[]} = {};
        //this.props.cs
        this.props.submitHITData.data.values.forEach(row => {
            const urls: {count: number, url: string, price: string}[] = [];
            const wKey = row[0];
            const tasks = row.slice(1);
            let countSoFar: {[key: string]: number} = {};
            tasks.forEach(tag => {
                countSoFar[tag] = 0;
            });
            if (this.props.spiData) {
                // const studHitConfigData = this.props.spiData[stud.wustlKey][this.props.currentProject.Name][this.props.currentIteration];
                const studConfig = this.props.spiData[wKey];
                if (studConfig) {
                    const studProjConfig = studConfig[this.props.currentProject.Name];
                    if (studProjConfig) {
                        const studHitConfigData = studProjConfig[this.props.currentIteration];
                        if (studHitConfigData) {
                            tasks.forEach(tag => {
                                const task = studHitConfigData.tasks.find(task => task.name === tag);
                                if (task) {
                                    countSoFar[tag] = task.count;
                                }
                            });
                        }
                    }
                }
            }
            const stud = this.props.students.find(stud => stud.wustlKey === wKey);
            console.log(wKey);
            if (stud) {
                tasks.forEach(tag => {
                    urls.push({
                        count:  Math.max(0, 3 - countSoFar[tag]),
                        url: this.buildURL(stud.wustlKey, stud.url, tag),
                        price: this.state.price
                    });
                });
            }
            hitData[wKey] = urls;
            console.log(urls);
        });
        return hitData;
    }

    async buildFromCountGiven(): Promise<{[wustlKey: string]: {count: number, url: string, price: string}[]}> {
        let hitData: {[wustlKey: string]: {count: number, url: string, price: string}[]} = {};
        this.props.submitHITData.data.values.forEach(row => {
            let urls = hitData[row[0]];
            if (urls === undefined) {
                urls = [];
                hitData[row[0]] = urls;
            }
            const stud = this.props.students.find(stud => stud.wustlKey === row[0]);
            if (stud){
                urls.push({
                    count:  parseInt(row[2]),
                    url: this.buildURL(stud.wustlKey, stud.url, row[1]),
                    price: this.state.price
                });
            }
        });
        console.log(hitData)
        return hitData;
    }

    buildURLS(): Promise<{[wustlKey: string]: {count: number, url: string, price: string}[]}> {
        if (this.props.submitHITData.dataType === SubmitHITDataType.COUNT_GIVEN) {
            return this.buildFromCountGiven();
        } else {
            return this.buildFromCountNotGiven();
        }
    }

    render() {
        return <div>
            <ButtonWithDescription
                buttonTitle={'Submit Hits'}
                description={'Submnits hits to MTurk based on the settings selected below.'}
                buttonClass={"refresh danger"}
                onClick={async () => {
                    try {
                        this.setState({
                            loadingState: LoadingState.LOADING,
                        });
                        const hitData = await this.buildURLS();
                        const resp = await MTPool.uploadHits(hitData, this.props.mturkMode, this.props.currentProject.Name);
                        this.state.errors.resetValues();
                        for (let i = 0; i < resp.length; i++) {
                            const re = await resp[i];
                            if ('error' in re) {
                                const row = this.state.errors.findFirstEntry([{
                                    index: 0,
                                    expectedValue: re.wustlKey
                                }, {index: 1, expectedValue: re.code}]);
                                if (row) {
                                    row[row.length - 1] = '' + (parseInt(row[row.length - 1]) + 1);
                                } else {
                                    this.state.errors.values.push([re.wustlKey, re.code, re.error, '1']);
                                }
                            } else {
                                // do nothing, got updated account balances
                            }
                        }
                        this.setState({
                            loadingState: LoadingState.SUCCESS,
                        });
                    } catch (e) {
                        this.setState({
                            loadingState: LoadingState.ERROR,
                        });
                    }
                    console.log("FINISHED LOADING: " + this.state.loadingState);
                }}
                display={true}
                loadingState={this.state.loadingState}
            />
            <SandboxToggle />
            <Toggle
                onChange={(num: number) => {
                    this.setState({activeTable: num});
                }}
                toggles={[
                    {
                        text: "Original Assignments",
                    },
                    {
                        text: "Remaining Assignments",
                    }
                ]}
                active={0}
            />
            <div className={'payment-input'}>
                <label>
                    Payout per HIT:
                </label>
                <input type={'number'} value={this.state.price} onChange={ev => this.setState({price: parseFloat(ev.target.value).toFixed(2)})} min={.05} max={.95} step={0.05}/>
            </div>
            {
                this.state.activeTable === 0 ? <Table/> : <DataTable data={this.getDiffData()}/>
            }
            <div>
                <h3>
                    Errors for submission:
                </h3>
                <DataTable data={this.state.errors} />
            </div>
        </div>
    }
}

export default connector(SubmitHits);
