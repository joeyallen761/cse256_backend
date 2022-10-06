import React from "react";
import ReactLoading from "react-loading";
import {FcCheckmark, FcCancel} from "react-icons/fc/index";
import {FaQuestion} from "react-icons/fa/index";

export enum LoadingState {
    FRESH,
    LOADING,
    SUCCESS,
    ERROR,
}

type Props = {
    buttonTitle: string;
    description: string;
    buttonClass: string;
    onClick: (ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) => any;
    display: boolean;
    loadingState: LoadingState;
    error?: string;
};

type State = {
    display: boolean;
};

export type BWDState = {
    loadingStatus: LoadingState;
    errorString?: string;
}

export default class ButtonWithDescription extends React.Component<Props, State> {

    private static size = 38;

    constructor(props: Props) {
        super(props);
        this.state = {
            display: false
        }
    }

    loading() {
        switch (this.props.loadingState) {
            case LoadingState.FRESH:
                return <FaQuestion fontSize={ButtonWithDescription.size}/>;
            case LoadingState.LOADING:
                return <ReactLoading color={"grey"} type={"spin"} height={ButtonWithDescription.size} width={ButtonWithDescription.size} />;
            case LoadingState.SUCCESS:
                return <FcCheckmark fontSize={ButtonWithDescription.size}/>;
            case LoadingState.ERROR:
                return <FcCancel fontSize={ButtonWithDescription.size}/>;
        }
    }

    render() {
        return this.props.display ? (
            <div className={'button-with-description'}>
                <div className={'button-container'}>
                    <button onClick={this.props.onClick} className={this.props.buttonClass}>{this.props.buttonTitle}</button>
                    <span>
                        {
                            this.loading()
                        }
                    </span>
                    <button className="info" onClick={() => this.setState({display: !this.state.display})}>Info</button>
                </div>
                <div className={this.state.display ? 'action-description' : 'action-description hide'}>
                    <div>{this.props.description}</div>
                    <hr/>
                    <h2> Errors: </h2>
                    <div>{this.props.error ? this.props.error : 'There were no errors.'}</div>
                </div>
            </div>
        ): null;
    }
}
