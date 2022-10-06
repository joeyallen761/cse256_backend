import {RootState, login, logout} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import React from "react";
import {awsLogin, awsLogout} from "../aws/aws-service";

const mapState = (state: RootState) => {
    return {};
};

const mapDispatchToProps = {
    login,
    logout
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

export const Login = connector(class Login extends React.Component<Props, {}> {

    usernameField = React.createRef<HTMLInputElement>();
    passwordField = React.createRef<HTMLInputElement>();

    render() {
        return (
            <div id={"login-container"}>
                <form onSubmit={
                    async ev => {
                        ev.preventDefault();
                        if (this.usernameField.current &&
                            this.passwordField.current
                        ) {
                            const success = await awsLogin(this.usernameField.current.value, this.passwordField.current.value)
                            if (success) {
                                this.props.login();
                            }
                        }
                    }}
                    >
                    <h1>
                        CSE 256 Console
                    </h1>
                    <fieldset>
                        <label>Username:</label>
                        <input type="text" placeholder={"Username..."} ref={this.usernameField} autoComplete="username"/>
                    </fieldset>
                    <fieldset>
                        <label>Password:</label>
                        <input type="password" placeholder={"Password..."} ref={this.passwordField} autoComplete="current-password"/>
                    </fieldset>
                    <button className="basic" type="submit"> Login </button>
                </form>
            </div>
        );
    }

});

export const Logout = connector(class Logout extends React.Component<Props, {}> {

    render() {
        return (<button className="safe" onClick={async () => {
            if (await awsLogout()) {
                this.props.logout();
            }
        }}> Logout </button>);
    }

});