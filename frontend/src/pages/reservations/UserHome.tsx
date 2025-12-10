import { useState } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon
} from '@chakra-ui/react';
import { CalendarIcon, TimeIcon } from '@chakra-ui/icons';
import { FiPackage } from 'react-icons/fi';
import ReservationCalendar from './ReservationCalendar';
import EquipmentListView from './EquipmentListView';
import MyReservations from './MyReservations';

export default function UserHome() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Box>
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        colorScheme="blue"
        variant="enclosed"
      >
        <TabList mb={4}>
          <Tab>
            <CalendarIcon mr={2} />
            予約カレンダー
          </Tab>
          <Tab>
            <Icon as={FiPackage} mr={2} />
            資機材一覧
          </Tab>
          <Tab>
            <TimeIcon mr={2} />
            予約履歴
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <ReservationCalendar />
          </TabPanel>
          <TabPanel px={0}>
            <EquipmentListView />
          </TabPanel>
          <TabPanel px={0}>
            <MyReservations />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
