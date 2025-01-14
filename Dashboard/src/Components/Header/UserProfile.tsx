import React, { FunctionComponent, ReactElement, useState } from 'react';
import IconProp from 'Common/Types/Icon/IconProp';
import Route from 'Common/Types/API/Route';
import RouteMap, { RouteUtil } from '../../Utils/RouteMap';
import PageMap from '../../Utils/PageMap';
import BlankProfilePic from 'CommonUI/src/Images/users/blank-profile.svg';
import HeaderIconDropdownButton from 'CommonUI/src/Components/Header/HeaderIconDropdownButton';
import IconDropdwonItem from 'CommonUI/src/Components/Header/IconDropdown/IconDropdownItem';
import IconDropdwonMenu from 'CommonUI/src/Components/Header/IconDropdown/IconDropdownMenu';

export interface ComponentProps {
    onClickUserProfle: () => void;
}

const DashboardUserProfile: FunctionComponent<ComponentProps> = (
    props: ComponentProps
): ReactElement => {
    const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);

    return (
        <>
            <HeaderIconDropdownButton
                iconImageUrl={BlankProfilePic}
                name="User Profile"
                showDropdown={isDropdownVisible}
                onClick={() => {
                    setIsDropdownVisible(true);
                }}
            >
                <IconDropdwonMenu>
                    <IconDropdwonItem
                        title="Profile"
                        onClick={() => {
                            setIsDropdownVisible(false);
                            props.onClickUserProfle();
                        }}
                        icon={IconProp.User}
                    />

                    <IconDropdwonItem
                        title="Log out"
                        onClick={() => {
                            setIsDropdownVisible(false);
                        }}
                        url={RouteUtil.populateRouteParams(
                            RouteMap[PageMap.LOGOUT] as Route
                        )}
                        icon={IconProp.Logout}
                    />
                </IconDropdwonMenu>
            </HeaderIconDropdownButton>
        </>
    );
};

export default DashboardUserProfile;
