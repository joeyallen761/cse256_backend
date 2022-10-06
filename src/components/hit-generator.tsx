import React from "react";
import {RootState, SPIData, updateSPIData, updateStudents} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";

export const mapState = (state: RootState) => {
    return {
        currentIteration: state.currentIteration,
        currentProject: state.currentProject,
        students: state.students,
        spiData: state.spiData
    };
};

export const mapDispatchToProps = {
    updateStudents,
    updateSPIData
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

enum Generated {
    LOADING ,
    NOT_GENERATED,
    GENERATED,
}

type State = BWDState & {
}

export default connector(class HITGenerator extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH,
        }
    }

    threeRands(max: number) {
        if (max < 3) {
            return [0, 0, 0];
        }
        let rands = [-1, -1, -1];
        let index = 0;
        while(rands.indexOf(-1) !== -1) {
            const ri = Math.floor(Math.random() * Math.floor(max));
            if (rands.indexOf(ri) === -1) {
                rands[index] = ri;
                index += 1;
            }
        }
        return rands;
    }

    generate() {
        if (this.props.spiData === null) {
            alert('Cannot generate when data has not been loaded from database.');
        }
        const tasks = this.props.currentProject.parsedTags;
        if (tasks !== undefined
            && tasks.length === 0
        ) {
            alert('Cannot generate task assignment when no tasks exist for this project. Add tags to this project on Semester Setup > Change Project.')
            return;
        }
        const newSPIData: SPIData = {};
        Object.assign(newSPIData, this.props.spiData);
        this.props.students.forEach(stud => {
            // @ts-ignore
            let studSPI = newSPIData[stud.wustlKey];
            if (studSPI === undefined) {
                studSPI = {};
                // @ts-ignore
                newSPIData[stud.wustlKey] = studSPI;
            }
            let pis = studSPI[this.props.currentProject.Name];
            if (pis === undefined) {
                pis = [];
                studSPI[this.props.currentProject.Name] = pis;
            }
            while (pis.length <= this.props.currentIteration) {
                pis.push({tasks: []});
            }
            const rands = this.threeRands(tasks.length);
            const tags = rands.map(ind => tasks[ind]);
            pis[this.props.currentIteration].tasks = [
                {
                    name: tags[0].tag,
                    count: 0
                },
                {
                    name: tags[1].tag,
                    count: 0
                },
                {
                    name: tags[2].tag,
                    count: 0
                },
            ];
            console.log(pis[pis.length - 1]);
        });
        this.props.updateSPIData(newSPIData);
        // upload new data to database
    }

    render() {
        const generated = this.props.spiData === null
            ? Generated.LOADING
            : this.props.students.some(stud => {
                const studData = (this.props.spiData as SPIData)[stud.wustlKey];
                if (studData) {
                    const pi = studData[this.props.currentProject.Name];
                    if (pi) {
                        return pi[this.props.currentIteration] !== undefined;
                    }
                }
                return false;
            }) ? Generated.GENERATED : Generated.NOT_GENERATED;
        return (
            <div className={'flex-actions'}>
                <div className={generated === Generated.LOADING ? '' : 'hide'}>
                    <h3>
                        The necessary data to display the available actions has not loaded from the database yet. If the database is properly configured and running this page will automatically refresh when the data is loaded.
                    </h3>
                </div>
                <ButtonWithDescription
                    buttonTitle={'Generate'}
                    description={'This button will generate the HIT assignments for all students. Nothing that is already in the database will be changed, modified, or destroyed by this action. Use this button once for each iteration of each project. This will generate a set of HITs for each student to perform for the requested iteration.'}
                    buttonClass={'safe'}
                    onClick={() => {
                        this.generate();
                    }}
                    display={generated === Generated.NOT_GENERATED}
                    loadingState={this.state.loadingStatus}
                />
                <ButtonWithDescription
                    buttonTitle={'Regenerate'}
                    description={'This button will REGENERATE the HIT assignments for all students. This will generate a new list of tasks for each student for this iteration and overwrite them in the database. Only run this if HITs have not already been submitted to MTurk. If they have do not run this or it will be impossible to connect logs generated from MTurk to the student that that log belongs to.'}
                    buttonClass={'danger'}
                    onClick={() => {
                        this.generate();
                    }}
                    display={generated === Generated.GENERATED}
                    loadingState={this.state.loadingStatus}
                />
            </div>
        );
    }
});