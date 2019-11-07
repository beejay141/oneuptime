import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import Dashboard from '../components/Dashboard';
import PropTypes from 'prop-types';
import RenderIfAdmin from '../components/basic/RenderIfAdmin';
import MonitorCategories from '../components/settings/MonitorCategories';

class Monitors extends Component {

    constructor(props) {
        super(props);
        this.props = props;
    }

    componentDidMount() {
        if (window.location.href.indexOf('localhost') <= -1) {
            this.context.mixpanel.track('Monitors page Loaded');
        }
    }

    render() {
        return (
            <Dashboard>
                <div className="Margin-vertical--12">
                    <div>
                        <div className="db-BackboneViewContainer">
                            <div className="react-settings-view react-view">
                                <span>
                                    <div>
                                        <div>
                                            <RenderIfAdmin>
                                                <MonitorCategories />
                                            </RenderIfAdmin>
                                        </div>
                                    </div>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Dashboard>
        );
    }
}

Monitors.contextTypes = {
    mixpanel: PropTypes.object.isRequired
};

Monitors.displayName = 'Monitors';

export default withRouter(connect(null, null)(Monitors));
