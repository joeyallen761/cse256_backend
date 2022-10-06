import React from "react";
import {AccountPair} from "../aws/mturk";
import {fetchAccountBalances, RootState} from "../redux/actions";
import {connect, ConnectedProps} from "react-redux";
import {store} from "../redux/store";
import {SandboxToggle} from "./toggle";

export const mapState = (state: RootState) => {
    return {
        balances: state.accountBalances,
        mturkMode: state.mturkMode,
    };
};

export const mapDispatchToProps = {};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};
type State = {};

class AccountBalances extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        if (this.props.balances === []) {
            store.dispatch(fetchAccountBalances(this.props.mturkMode));
        }
    }

    render() {
        return (
            <div>
                <button className={"act basic refresh"} onClick={() => store.dispatch(fetchAccountBalances(this.props.mturkMode))}> Refresh </button>
                <SandboxToggle />
                <table className={"component"}>
                    <thead>
                        <tr>
                            <th>
                                WUSTL Key
                            </th>
                            <th>
                                Balance
                            </th>
                            <th>
                                Ready for Submission
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            this.props.balances
                                .sort((a, b) => {
                                    const aVal = parseFloat(a.balance);
                                    const bVal = parseFloat(b.balance);
                                    if (aVal <= 9.99 && bVal <= 9.99) {
                                        return 0;
                                    } else if (aVal <= 9.99) {
                                        return -1;
                                    } else {
                                        return 1;
                                    }
                                })
                                .map((pair: AccountPair) => {
                                const ready = parseFloat(pair.balance) > 9.99 || parseFloat(pair.balance) == 0.02;
                                return (<tr key={pair.wustlKey}>
                                    <th>
                                        {pair.wustlKey}
                                    </th>
                                    <td>
                                        {pair.balance}
                                    </td>
                                    <td className={ready ? "ready" : "not-ready"}>
                                        {ready ? "Ready" : "Not Ready"}
                                    </td>
                                </tr>);
                            })
                        }
                    </tbody>
                </table>
            </div>
        );
    }

}

export default connector(AccountBalances);