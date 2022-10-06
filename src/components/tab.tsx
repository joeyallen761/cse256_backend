import React from "react";
import DBStatus from "./db-status";
import ProjectIterationSelector from "./project-iteration-selector";
import UpdateProjects from "./update-projects";
import Table from "./table";
import {Logout} from "./login";
import ButtonWithDescription, {BWDState, LoadingState} from "./button-with-description";
import StudentFileInput from "./file-input";
import HITGenerator from "./hit-generator";
import AccountBalances from "./account-balances";
import SubmitHits from "./submit-hits";
import CancelHits from "./cancel-hits";
import DownloadZip from "./download-zip";
import PayHits from "./pay-hits";
import HitStatuses from "./hit-status";
import Disqualify from "./disqualify";

type TabRef = {tab: Tab | undefined}

interface TabProps {
    tabRef: TabRef;
    actions: {urlName: string, name: string, description: string, component: JSX.Element}[];
    display: boolean;
}

interface TabState {
    index: number
}

export class Tab extends React.Component<TabProps, TabState> {

    constructor(props: TabProps) {
        super(props);
        this.props.tabRef.tab = this;
        this.state = {
            index: 0,
        }
    }

    displayName(urlName: string) {
        const index = this.props.actions.findIndex(value => value.urlName === urlName);
        if (index >= 0) {
            this.display(index);
        }
    }

    display(index: number) {
        this.setState({index});
    }

    render() {
        return (
            <div className={this.props.display ? "tab" : "tab hide"}>
                <div className={"tab-content"}>
                    <div className={"sidebar"}>
                        {
                            [...this.props.actions.map((action, index) => (
                                <button
                                    className={index === this.state.index ? 'action active' : 'action'}
                                    onClick={() => this.display(index)}
                                    key={index}
                                >
                                    {
                                        action.name
                                    }
                                </button>
                            )), <div className={"sidebar-filler"} key={this.props.actions.length}> </div>]
                        }
                    </div>
                    <div className={"output-container"}>
                        <div className={"output"}>
                            {this.props.children ? this.props.children: null}
                            {
                                this.props.actions.map((action, index) => {
                                    return (
                                        <div
                                            className={index === this.state.index ? 'component-wrapper' : 'component-wrapper hide'}
                                            key={index}
                                        >
                                            <div className={'tab-header'}>
                                                <h1>
                                                    {
                                                        action.name
                                                    }
                                                </h1>
                                                <p className={"description"}>
                                                    {
                                                        action.description
                                                    }
                                                </p>
                                            </div>
                                            {
                                                action.component
                                            }
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }

}

interface ConcreteTabProps {
    display: boolean;
    tabRef: TabRef;
}

export class SemesterManagementTab extends React.Component<ConcreteTabProps, BWDState> {

    constructor(props: ConcreteTabProps) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH
        };
    }


    render() {
        return <Tab
            tabRef={this.props.tabRef}
            display={this.props.display}
            actions={[
                {
                    urlName: 'clear_db',
                    name: 'Clear Database',
                    description: 'Deletes all data from the database that is specific to a semester. Retains login data and other non-semester specific data.',
                    component: (<div>
                                    <div>
                                        <ButtonWithDescription
                                            buttonTitle={'Clear Database'}
                                            description={'Clicking this button will delete all data from the database that is not meant to be carried over. This includes: HIT assignments, Student ID to HIT ID mappings and more. Click this button once the semester is completely over and you are ready to clean out all of the old data.'}
                                            buttonClass={'danger'}
                                            onClick={() => {}}
                                            display={true}
                                            loadingState={this.state.loadingStatus}
                                        />
                                    </div>
                                    <DBStatus/>
                                </div>)
                },
                {
                    urlName: 'change_projects',
                    name: 'Change Projects',
                    description: 'Allows you to view and change projects for this course.',
                    component: <UpdateProjects/>
                }
            ]}
        />
    }

}

export class HitManagementTab extends React.Component<ConcreteTabProps, {}> {

    render() {
        return <Tab
            tabRef={this.props.tabRef}
                display={this.props.display}
                actions={[
                    {
                        urlName: 'generate_hits',
                        name: 'Generate HITs',
                        description: 'Generate HITs for each student. HITs will be generated based on current project and iteration as well as information about which HITs that they have had for previous iterations.',
                        component: (
                            <div>
                                <HITGenerator/>
                                <DBStatus/>
                                <Table />
                            </div>
                        )
                    },
                    {
                        urlName: 'check_account_balances',
                        name: 'Check Account Balances',
                        description: 'Checks the account balances for all accounts in the uploaded credentials file.',
                        component: <AccountBalances />
                    },
                    {
                        urlName: 'submit_hits',
                        name: 'Submit HITs',
                        description: 'Submit hits for the current project and iteration. These hits will be submitted based on the currently generated hits for this project and iteration. You can view those in the table below. If you would like different task assignments then change them here: [insert button that leads to generate hit assignment]',
                        component: <SubmitHits />
                    },
                    {
                        urlName: 'hit_statuses',
                        name: 'HIT Statuses',
                        description: 'Display the status of all of the hits that are currently running on MTurk. You can use this information to determine how quickly hits are coming in.',
                        component: <HitStatuses />
                    },
                    {
                        urlName: 'cancel_hits',
                        name: 'Cancel HITs',
                        description: 'Allows you to cancel all hits for all accounts listed in the current credentials file.',
                        component: <CancelHits />
                    },
                    {
                        urlName: 'download_logs',
                        name: 'Download Logs',
                        description: 'Allows you to download all logs for a given project and iteration.',
                        component: <DownloadZip />
                    },
                    {
                        urlName: 'pay_hits',
                        name: 'Pay HITs',
                        description: 'Allows you to pay hits if given a csv file of payment details.',
                        component: <PayHits />
                    }
                ]}
        >
            <ProjectIterationSelector />
        </Tab>
    }

}

export class PostHitManagementTab extends React.Component<ConcreteTabProps, {}> {

    render() {
        return <Tab
            tabRef={this.props.tabRef}
            display={this.props.display}
            actions={[
                {
                    urlName: 'disqualify',
                    name: 'Disqualify HITs',
                    description: 'Disqualifies workers based on the currently selected project and iteration so they cannot do the next iterations for the same project.',
                    component: <Disqualify />
                }
            ]}
        >
            <ProjectIterationSelector />
        </Tab>
    }

}

export class SessionManagementTab extends React.Component<ConcreteTabProps, BWDState> {

    constructor(props: ConcreteTabProps) {
        super(props);
        this.state = {
            loadingStatus: LoadingState.FRESH,
        };
    }
    render() {
        return <Tab
            tabRef={this.props.tabRef}
            display={this.props.display}
            actions={
                [
                    {
                        urlName: 'load_student_credentials',
                        name: 'Load Student Credentials',
                        description: 'Load in student credentials if you need to interact with students and/or their Mturk accounts.',
                        component:
                            <div>
                                <StudentFileInput />
                                <ButtonWithDescription
                                    buttonTitle={'Download CSV Template...'}
                                    description={'This will download a CSV Template that you can then fill out with student credentials. This template has correctly spelt and formatted headers so that there are no validation errors when uploading it later.'}
                                    buttonClass={'safe'}
                                    onClick={() => {
                                        const uri = 'data:text/plain;charset=utf-8,' + encodeURIComponent("WUSTL Key,GH Pages URL,AWS IAM ID,AWS IAM SECRET\n");
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = uri;
                                        a.download = 'student-credentials.csv';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                    }}

                                    display={true}
                                    loadingState={this.state.loadingStatus}
                                />
                            </div>
                    },
                    {
                        urlName: 'logout',
                        name: 'Logout',
                        description: 'Use this to log out of the application.',
                        component: <Logout />
                    },
                ]}
        />
    }

}
