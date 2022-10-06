import React from "react";
import {connect, ConnectedProps} from 'react-redux'
import {EDBStatus, RootState, updateDBStatus} from "../redux/actions";
import {table} from "../aws/db";

const mapState = (state: RootState) => {
    return {
        dbStatus: state.dbStatus
    }
};

const mapDispatchToProps = {
    updateDBStatus
};

const connector = connect(mapState, mapDispatchToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & {};

class DBStatus extends React.Component<Props, {}> {

    renderCheck() {
        return (
          <button className={"status-update safe right"} onClick={async () => {
              this.props.updateDBStatus((await table?.exists) ? EDBStatus.Created : EDBStatus.DoesNotExist);
          }}>
              Check
          </button>
        );
    }

    status() {
        switch (this.props.dbStatus) {
            case EDBStatus.Unknown:
                return 'The status is currently unknown. Would you like to check?';
            case EDBStatus.Created:
                return 'The database is created and awaiting requests.';
            case EDBStatus.DoesNotExist:
                return 'The database does not exist. You should initialize it if you would like to use it.';
        }
    }

    render() {
        return (
            <div className={"status-container"}>
                {this.renderCheck()}
                <h2>
                    Database Status:
                </h2>
                <p className={"status"}>
                    {this.status()}
                </p>
            </div>
        );
    }

}

export default connector(DBStatus);