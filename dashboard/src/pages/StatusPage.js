import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Fade from 'react-reveal/Fade';
import Dashboard from '../components/Dashboard';
import ShouldRender from '../components/basic/ShouldRender';
import Setting from '../components/statusPage/Setting';
import Basic from '../components/statusPage/Basic';
import Header from '../components/statusPage/Header';
import Monitors from '../components/statusPage/Monitors';
import Branding from '../components/statusPage/Branding';
import Links from '../components/statusPage/Links';
import DeleteBox from '../components/statusPage/DeleteBox';
import DuplicateStatusBox from '../components/statusPage/DuplicateStatusPage';
import PrivateStatusPage from '../components/statusPage/PrivateStatusPage';
import RenderIfSubProjectAdmin from '../components/basic/RenderIfSubProjectAdmin';
import { LoadingState } from '../components/basic/Loader';
import PropTypes from 'prop-types';
import { logEvent } from '../analytics';
import { SHOULD_LOG_ANALYTICS } from '../config';
import { history } from '../store';
import {
    fetchSubProjectStatusPages,
    switchStatusPage,
    fetchProjectStatusPage,
} from '../actions/statusPage';
import CustomStyles from '../components/statusPage/CustomStyles';
import EmbeddedBubble from '../components/statusPage/EmbeddedBubble';
import BreadCrumbItem from '../components/breadCrumb/BreadCrumbItem';
import getParentRoute from '../utils/getParentRoute';
import { Tab, Tabs, TabList, TabPanel, resetIdCounter } from 'react-tabs';

class StatusPage extends Component {
    async componentDidMount() {
        if (!this.props.statusPage.status._id) {
            const projectId = history.location.pathname
                .split('project/')[1]
                .split('/')[0];
            const statusPageId = history.location.pathname
                .split('status-page/')[1]
                .split('/')[0];
            await this.props.fetchProjectStatusPage(projectId);
            await this.props.fetchSubProjectStatusPages(projectId);

            if (
                this.props.statusPage.subProjectStatusPages &&
                this.props.statusPage.subProjectStatusPages.length > 0
            ) {
                const { subProjectStatusPages } = this.props.statusPage;
                subProjectStatusPages.forEach(subProject => {
                    const statusPages = subProject.statusPages;
                    const statusPage = statusPages.find(
                        page => page._id === statusPageId
                    );
                    if (statusPage) {
                        this.props.switchStatusPage(statusPage);
                    }
                });
            }
        }
        if (SHOULD_LOG_ANALYTICS) {
            logEvent(
                'PAGE VIEW: DASHBOARD > PROJECT > STATUS PAGE LIST > STATUS PAGE'
            );
        }
    }
    componentWillMount() {
        resetIdCounter();
    }
    tabSelected = index => {
        const tabSlider = document.getElementById('tab-slider');
        tabSlider.style.transform = `translate(calc(${tabSlider.offsetWidth}px*${index}), 0px)`;
    };

    render() {
        const {
            location: { pathname },
            statusPage: { status },
        } = this.props;
        const pageName = status ? status.name : null;

        return (
            <Dashboard>
                <Fade>
                    <BreadCrumbItem
                        route={getParentRoute(pathname)}
                        name="Status Pages"
                    />
                    <BreadCrumbItem
                        route={pathname}
                        name={pageName}
                        pageTitle="Status Page"
                        status={pageName}
                    />
                    <Tabs
                        selectedTabClassName={'custom-tab-selected'}
                        onSelect={tabIndex => this.tabSelected(tabIndex)}
                    >
                        <div className="Flex-flex Flex-direction--columnReverse">
                            <TabList
                                id="customTabList"
                                className={'custom-tab-list'}
                            >
                                <Tab className={'custom-tab custom-tab-5'}>
                                    Basic
                                </Tab>
                                <Tab className={'custom-tab custom-tab-5'}>
                                    Custom Domains
                                </Tab>
                                <Tab className={'custom-tab custom-tab-5'}>
                                    Branding
                                </Tab>
                                <Tab className={'custom-tab custom-tab-5'}>
                                    Embedded
                                </Tab>
                                <Tab className={'custom-tab custom-tab-5'}>
                                    Advanced Options
                                </Tab>
                                <div
                                    id="tab-slider"
                                    className="custom-tab-5"
                                ></div>
                            </TabList>
                        </div>

                        <div className="Box-root">
                            <div>
                                <div>
                                    <div className="db-BackboneViewContainer">
                                        <div className="react-settings-view react-view">
                                            <span data-reactroot="">
                                                <div>
                                                    <div>
                                                        <ShouldRender
                                                            if={
                                                                !this.props
                                                                    .statusPage
                                                                    .requesting
                                                            }
                                                        >
                                                            <TabPanel>
                                                                <Fade>
                                                                    <div className="Box-root Margin-bottom--12">
                                                                        <Header />
                                                                    </div>
                                                                    <div className="Box-root Margin-bottom--12">
                                                                        <Basic />
                                                                    </div>
                                                                    <RenderIfSubProjectAdmin
                                                                        subProjectId={
                                                                            this
                                                                                .props
                                                                                .match
                                                                                .params
                                                                                .subProjectId
                                                                        }
                                                                    >
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            <Monitors
                                                                                subProjectId={
                                                                                    this
                                                                                        .props
                                                                                        .match
                                                                                        .params
                                                                                        .subProjectId
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </RenderIfSubProjectAdmin>
                                                                </Fade>
                                                            </TabPanel>
                                                            <TabPanel>
                                                                <Fade>
                                                                    <div className="Box-root Margin-bottom--12">
                                                                        <Setting />
                                                                    </div>
                                                                </Fade>
                                                            </TabPanel>
                                                            <TabPanel>
                                                                <Fade>
                                                                    <RenderIfSubProjectAdmin
                                                                        subProjectId={
                                                                            this
                                                                                .props
                                                                                .match
                                                                                .params
                                                                                .subProjectId
                                                                        }
                                                                    >
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            <Branding />
                                                                        </div>
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            <Links />
                                                                        </div>
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            <CustomStyles />
                                                                        </div>
                                                                    </RenderIfSubProjectAdmin>
                                                                </Fade>
                                                            </TabPanel>
                                                            <TabPanel>
                                                                <Fade>
                                                                    <div className="Box-root Margin-bottom--12">
                                                                        <EmbeddedBubble />
                                                                    </div>
                                                                </Fade>
                                                            </TabPanel>
                                                            <TabPanel>
                                                                <Fade>
                                                                    <RenderIfSubProjectAdmin
                                                                        subProjectId={
                                                                            this
                                                                                .props
                                                                                .match
                                                                                .params
                                                                                .subProjectId
                                                                        }
                                                                    >
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            <PrivateStatusPage />
                                                                        </div>
                                                                        <div className="Box-root Margin-bottom--12">
                                                                            {this
                                                                                .props
                                                                                .showDuplicateStatusPage ? (
                                                                                <DuplicateStatusBox
                                                                                    statusPageId={
                                                                                        this
                                                                                            .props
                                                                                            .statusPage
                                                                                            .status
                                                                                            ._id
                                                                                    }
                                                                                    subProjectId={
                                                                                        this
                                                                                            .props
                                                                                            .match
                                                                                            .params
                                                                                            .subProjectId
                                                                                    }
                                                                                    projectId={
                                                                                        history.location.pathname
                                                                                            .split(
                                                                                                'project/'
                                                                                            )[1]
                                                                                            .split(
                                                                                                '/'
                                                                                            )[0]
                                                                                    }
                                                                                />
                                                                            ) : null}
                                                                        </div>
                                                                    </RenderIfSubProjectAdmin>
                                                                    <RenderIfSubProjectAdmin
                                                                        subProjectId={
                                                                            this
                                                                                .props
                                                                                .match
                                                                                .params
                                                                                .subProjectId
                                                                        }
                                                                    >
                                                                        <DeleteBox
                                                                            match={
                                                                                this
                                                                                    .props
                                                                                    .match
                                                                            }
                                                                        />
                                                                    </RenderIfSubProjectAdmin>
                                                                </Fade>
                                                            </TabPanel>
                                                        </ShouldRender>
                                                        <ShouldRender
                                                            if={
                                                                this.props
                                                                    .statusPage
                                                                    .requesting
                                                            }
                                                        >
                                                            <LoadingState />
                                                        </ShouldRender>
                                                    </div>
                                                </div>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                </Fade>
            </Dashboard>
        );
    }
}

const mapDispatchToProps = dispatch => {
    return bindActionCreators(
        {
            fetchSubProjectStatusPages,
            switchStatusPage,
            fetchProjectStatusPage,
        },
        dispatch
    );
};

function mapStateToProps(state) {
    return {
        statusPage: state.statusPage,
        showDuplicateStatusPage: state.statusPage.showDuplicateStatusPage,
    };
}

StatusPage.propTypes = {
    statusPage: PropTypes.object.isRequired,
    switchStatusPage: PropTypes.func,
    fetchProjectStatusPage: PropTypes.func,
    fetchSubProjectStatusPages: PropTypes.func,
    showDuplicateStatusPage: PropTypes.bool,
    match: PropTypes.object,
    location: PropTypes.shape({
        pathname: PropTypes.string,
    }),
};

StatusPage.displayName = 'StatusPage';

export default connect(mapStateToProps, mapDispatchToProps)(StatusPage);
