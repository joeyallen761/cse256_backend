import React from 'react';
import {MTurkMode, RootState, updateMTurkMode} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";

type Props = {
    onChange: (num: number) => any;
    toggles: {text: string, action?: () => any}[];
    active: number;
}

export class Toggle extends React.Component<Props, {}> {

    constructor(props: Props) {
        super(props);
    }

    onClick(active: number) {
        this.props.onChange(active);
    }

    render() {
        return (
            <div className="toggle-container">
                {
                    this.props.toggles.map((toggle, ind) =>
                        <button
                            key={toggle.text}
                            className={this.props.active === ind ? "safe toggle active" : "safe toggle"}
                            onClick={() => {
                                this.onClick(ind);
                                if (toggle.action) {
                                    toggle.action();
                                }
                            }}
                        >
                            {toggle.text}
                        </button>
                    )
                }
            </div>
        );
    }
}

type SingleToggleState = {
    active: number;
}

export class SingleToggle extends React.Component<Props, SingleToggleState> {

    constructor(props: Props) {
        super(props);
        this.state = {
            active: props.active
        };
    }

    onClick(active: number) {
        this.props.onChange(active);
        this.setState({active: active});
    }

    render() {
        return <Toggle
            onChange={num => this.onClick(num)}
            toggles={this.props.toggles}
            active={this.state.active}
        />;
    }
}

export const mapStateSandboxToggle = (state: RootState) => {
    return {
        mturkMode: state.mturkMode,
    };
};

export const mapDispatchToSandboxToggleProps = {
    updateMTurkMode,
};

const sandboxToggleConnector = connect(mapStateSandboxToggle, mapDispatchToSandboxToggleProps);

type SandboxToggleProps = ConnectedProps<typeof sandboxToggleConnector>;

type SandboxToggleState = {}

export const SandboxToggle = sandboxToggleConnector(class SandboxToggle extends React.Component<SandboxToggleProps, SandboxToggleState>{

    render() {
        return (
            <Toggle
                onChange={(num: number) => {
                    const sandbox = num === 0; // 1 is real mturk
                    // set the global state of sandbox to true
                }}
                active={this.props.mturkMode === MTurkMode.SANDBOX ? 0 : 1}
                toggles={[
                    {
                        text: "Submit to Sandbox MTurk",
                        action: () => {
                            this.props.updateMTurkMode(MTurkMode.SANDBOX);
                        }
                    },
                    {
                        text: "Submit to Real MTurk",
                        action: () => {
                            this.props.updateMTurkMode(MTurkMode.REAL);
                        }
                    }
                ]}
            />
        );
    }
});
