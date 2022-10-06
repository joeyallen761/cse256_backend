import React from 'react';
import './App.css';
import {HitManagementTab, PostHitManagementTab, SemesterManagementTab, SessionManagementTab, Tab} from "../components/tab";
import {login, LoginStatus, logout, RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import {Login} from "../components/login";
import {awsLogin} from "../aws/aws-service";


enum NavLocation {
    SessionManagement = 'session',
    HITManagement = 'deploy',
    PostHITManagement = 'post_deployment',
    SemesterManagement = 'semester_setup',
}

class NavBar extends React.Component<{ startNavLocation: NavLocation, onUpdateActive: (input: NavLocation) => any }, { currentActive: { index: number, navLocation: NavLocation } }> {
    rs = new Array<() => React.RefObject<HTMLButtonElement>>(Object.keys(NavLocation).length).fill(() => React.createRef<HTMLButtonElement>(), 0, Object.keys(NavLocation).length).map(fun => fun());

    constructor(props: { startNavLocation: NavLocation, onUpdateActive: (input: NavLocation) => any }) {
        super(props);
        this.state = {
            currentActive: {index: 0, navLocation: NavLocation.SemesterManagement}
        };
    }

    updateActive(index: number, navLocation: NavLocation) {
        const oldActive = this.state.currentActive;
        if (oldActive.index === index) {
            return;
        }
        this.rs[oldActive.index].current?.classList.remove('active');
        this.rs[index].current?.classList.add('active');
        this.setState({currentActive: {index: index, navLocation: navLocation}});
        this.props.onUpdateActive(navLocation);
    }

    render() {
        return (
            <nav className="header">
                {
                    [
                        (<div className={"filler logo"} key={-1}>
                            CSE 256
                        </div>), ...this.rs.map((val, index) => {
                        const ind = index;
                        const navLocation = Object.values(NavLocation)[ind];
                        return (
                            <button ref={val} key={ind}
                                    className={this.props.startNavLocation === navLocation ? "active" : ""}
                                    onClick={() => this.updateActive(ind, navLocation)}>
                                {
                                    navLocation
                                        .split("_")
                                        .map(str => str.charAt(0).toUpperCase() + str.slice(1))
                                        .join(" ")
                                }
                            </button>
                        );
                    })]
                }
            </nav>
        );
    }

}

class Footer extends React.Component<{}, {}> {
    render() {
        return (
            <div className={"footer"}>
                <div className={"attribution"}>
                    Icons made by&nbsp;
                    <a href="https://www.flaticon.com/authors/google" title="Google">
                        Google
                    </a>
                    &nbsp;from&nbsp;
                    <a href="https://www.flaticon.com/" title="Flaticon">
                        www.flaticon.com
                    </a>
                </div>
            </div>
        );
    }
}

const mapState = (state: RootState) => {
    return {
        loggedIn: state.loggedIn
    };
};

const mapDispatchToProps = {
    login,
    logout
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

type TabRef = {tab: Tab | undefined}
type TabMap = {[key: string]: TabRef}

class Tabs extends React.Component<any, { navLocation: NavLocation }> {

    rs: TabMap = {
        [NavLocation.SemesterManagement as string]: {tab: undefined},
        [NavLocation.HITManagement as string]: {tab: undefined},
        [NavLocation.PostHITManagement as string]: {tab: undefined},
        [NavLocation.SessionManagement as string]: {tab: undefined},
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            navLocation: NavLocation.SessionManagement,
        };
    }

    componentDidMount() {
        // eslint-disable-next-line no-restricted-globals
        const loc = location.hash;
        if (loc === "") {
            return;
        }
        const path = loc.split(".");
        if (path.length >= 3) {
            return;
        }
        const tab = path[0].slice(1) as NavLocation;
        const action = path.length === 2 ? path[1] : "";
        if (Object.values(NavLocation).includes(tab)) {
            this.setState({navLocation: tab}, () => {
                (this.rs[tab].tab as Tab).displayName(action);
            });
        }
    }

    render() {
        return (
        <div className="app">
            <NavBar startNavLocation={this.state.navLocation}
                    onUpdateActive={(navLocation) => this.setState({navLocation: navLocation})}/>
            <SessionManagementTab tabRef={this.rs[NavLocation.SessionManagement]} display={this.state.navLocation === NavLocation.SessionManagement}/>
            <HitManagementTab tabRef={this.rs[NavLocation.HITManagement]} display={this.state.navLocation === NavLocation.HITManagement}/>
            <PostHitManagementTab tabRef={this.rs[NavLocation.PostHITManagement]} display={this.state.navLocation === NavLocation.PostHITManagement}/>
            <SemesterManagementTab tabRef={this.rs[NavLocation.SemesterManagement]} display={this.state.navLocation === NavLocation.SemesterManagement}/>
            <Footer/>
        </div>
        );
    }

}

class App extends React.Component<Props, {}> {

    componentDidMount() {
        console.log("mounted")
        awsLogin('', '')
            .then(
                value => {
                    if (value) {
                        console.log("login")
                        this.props.login();
                    } else {
                        console.log("logout")
                        this.props.logout();
                    }
                },
                reason => {
                    console.log(reason)
                    this.props.logout();
                    // error -> rejection
                })
            .catch(reason => {
                // do nothing
                console.log("logout")
                console.log(reason)
                this.props.logout();
            });
    }

    render() {
        if (this.props.loggedIn === LoginStatus.UNATTEMPTED) {
            return <div className={"app splash"}></div>;
        } else if (this.props.loggedIn === LoginStatus.SUCCEEDED) {
            return <Tabs></Tabs>;
        } else {
            return <div className="app"><Login/></div>;
        }
    }
}

export default connector(App);
