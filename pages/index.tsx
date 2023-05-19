import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilSquareIcon,
  PresentationChartLineIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';
import {
  Button,
  Callout,
  Card,
  Col,
  Color,
  Divider,
  Grid,
  Subtitle,
  Text,
  Title,
} from '@tremor/react';
import axios from 'axios';
import { toPng } from 'html-to-image';

import download from 'downloadjs';
import { NextPage } from 'next';
import { getSession } from 'next-auth/react';
import Link from 'next/link';
import React, { useCallback, useMemo, useState } from 'react';
import Chart from '../components/ChartComponent';
import Github from '../components/GitHub';
import LoadingDots from '../components/LoadingDots';
import { SegmentedControl } from '../components/atoms/SegmentedControl';
import { IconColor, Select } from '../components/atoms/Select';
import { TextArea } from '../components/atoms/TextArea';
import { Toggle } from '../components/atoms/Toggle';

const SectionHeader = ({
  stepNumber,
  title,
}: {
  stepNumber: number;
  title: string;
}) => {
  return (
    <div className="flex items-center">
      <div className="bg-blue-100 dark:bg-blue-500/20 text-blue-500 font-semi-bold font-mono mr-2 h-6 w-6 rounded-full flex items-center justify-center">
        {stepNumber}
      </div>
      <Subtitle className="text-gray-700 dark:text-gray-300">{title}</Subtitle>
    </div>
  );
};

const CHART_TYPES = [
  'area',
  'bar',
  'line',
  'composed',
  'scatter',
  'pie',
  'radar',
  'radialbar',
  'treemap',
  'funnel',
];

const NewHome: NextPage = () => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(false);
  const [shouldRenderChart, setShouldRenderChart] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [chartColor, setChartColor] = useState<Color>('blue');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const chartComponent = useMemo(() => {
    return (
      <Chart
        data={chartData}
        chartType={chartType}
        color={chartColor as Color}
        showLegend={showLegend}
      />
    );
  }, [chartData, chartType, chartColor, showLegend]);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(event.target.value);
    },
    []
  );

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();

    setError(false);
    setIsLoading(true);

    try {
      const chartTypeResponse = await axios.post('/api/get-type', {
        inputData: inputValue,
      });

      console.log({ res: chartTypeResponse.data });

      const session = await getSession();

      if (!CHART_TYPES.includes(chartTypeResponse.data.toLowerCase()))
        return setError(true);

      setChartType(chartTypeResponse.data);

      const libraryPrompt = `Generate a valid JSON in which each element is an object. Strictly using this FORMAT and naming:
[{ "name": "a", "value": 12, "color": "#4285F4" }] for Recharts API. Make sure field name always stays named name. Instead of naming value field value in JSON, name it based on user metric.\n Make sure the format use double quotes and property names are string literals. \n\n${inputValue}\n Provide JSON data only. `;

      const chartDataResponse = await axios.post('/api/parse-graph', {
        prompt: libraryPrompt,
        session: session,
      });

      let parsedData;

      try {
        parsedData = JSON.parse(chartDataResponse.data);
      } catch (error) {
        setError(true);
        console.error('Failed to parse chart data:', error);
      }

      setChartData(parsedData);
      setChartType(chartTypeResponse.data);
      setShouldRenderChart(true);
    } catch (error) {
      setError(true);
      console.error('Failed to generate graph data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadClick = async (selector: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) {
      return;
    }
    toPng(element).then(function (dataUrl) {
      download(dataUrl, 'chart.png');
    });
  };

  return (
    <Grid
      numCols={1}
      numColsSm={2}
      numColsLg={3}
      className="gap-y-4 lg:gap-x-4 h-full"
    >
      <aside className="h-full shrink-0 w-full flex flex-col justify-between lg:col-span-1 col-span-2 order-last lg:order-first">
        <form id="generate-chart" onSubmit={handleSubmit} className="space-y-4">
          <SectionHeader
            stepNumber={1}
            title="What would you like to visualize?"
          />
          <TextArea
            id="input"
            name="prompt"
            placeholder="Show me a bar chart with COVID-19 cases in London in March 2020..."
            value={inputValue}
            required
            autoFocus
            onChange={handleInputChange}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                handleSubmit(event);
              }
            }}
          />
          <Button
            type="button"
            variant="light"
            className="w-full outline-none focus:outline-none ring-0 focus:ring-0"
            icon={showAdvanced ? ChevronUpIcon : ChevronDownIcon}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button>

          {showAdvanced && (
            <div className="space-y-4">
              <SegmentedControl
                selectedIndex={selectedIndex}
                setSelectedIndex={setSelectedIndex}
                items={[
                  {
                    children: 'Chart',
                    icon: ChartBarIcon,
                  },
                  { children: 'PowerPoint', icon: PresentationChartLineIcon },
                ]}
                fullWidth
              />
              <div>
                <Text className="mb-1 dark:text-zinc-400">Chart type</Text>
                <Select
                  name="chart-type"
                  value={chartType}
                  onValueChange={setChartType}
                  items={[
                    { value: 'bar', textValue: 'Bar Chart' },
                    { value: 'area', textValue: 'Area Chart' },
                    { value: 'line', textValue: 'Line Chart' },
                    { value: 'composed', textValue: 'Composed Chart' },
                    { value: 'pie', textValue: 'Pie Chart' },
                    { value: 'scatter', textValue: 'Scatter Chart' },
                    { value: 'radar', textValue: 'Radar Chart' },
                    { value: 'radialbar', textValue: 'Radial Bar Chart' },
                    { value: 'treemap', textValue: 'Treemap' },
                    { value: 'funnel', textValue: 'Funnel Chart' },
                  ]}
                />
              </div>
            </div>
          )}

          <div className="py-2">
            <Divider className="h-px dark:bg-black" />
          </div>

          <SectionHeader stepNumber={2} title="Make any tweaks to the chart" />
          <div>
            <label
              htmlFor="title"
              className="text-zinc-500 dark:text-zinc-400 text-sm font-normal select-none	mb-3"
            >
              Color
            </label>
            <Select
              value={chartColor as Color}
              onValueChange={value => setChartColor(value as Color)}
              leftIcon={SwatchIcon}
              leftIconColor={chartColor as IconColor}
              items={[
                { value: 'blue', textValue: 'Blue' },
                { value: 'purple', textValue: 'Purple' },
                { value: 'green', textValue: 'Green' },
                { value: 'pink', textValue: 'Pink' },
                { value: 'yellow', textValue: 'Yellow' },
              ]}
            />
          </div>

          <div className="flex justify-between w-full">
            <label
              htmlFor="title"
              className="text-zinc-500 dark:text-zinc-400 text-sm font-normal select-none	"
            >
              Show chart Title
            </label>
            <Toggle
              id="title"
              size="sm"
              label="Show chart Title"
              checked={showTitle}
              setChecked={setShowTitle}
            />
          </div>
          <div className="flex justify-between w-full">
            <label
              htmlFor="legend"
              className="text-zinc-500 dark:text-zinc-400 text-sm font-normal select-none"
            >
              Show chart Legend
            </label>
            <Toggle
              id="legend"
              size="sm"
              label="Show chart Legend"
              checked={showLegend}
              setChecked={setShowLegend}
            />
          </div>
        </form>
        <Button
          type="submit"
          form="generate-chart"
          className="w-full cursor-pointer py-2 px-4 mt-4 mb-4 lg:mb-0 rounded-full blue-button-w-gradient-border [text-shadow:0_0_1px_rgba(0,0,0,0.25)] shadow-2xl items-center justify-center false"
          icon={PencilSquareIcon}
        >
          Draw
        </Button>
      </aside>

      <Col
        numColSpan={1}
        numColSpanSm={2}
        numColSpanMd={2}
        className="bg-zinc-100 rounded-md py-12 px-4 lg:py-4 border border-zinc-200 dark:border-zinc-900 dark:bg-black h-full dot-grid-gradient-light dark:dot-grid-gradient-dark flex justify-center items-center relative"
      >
        <div className="flex absolute top-4 left-4">
          <a
            href="https://github.com/whoiskatrin/chart-gpt"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button
              size="xs"
              color="zinc"
              variant="secondary"
              icon={Github}
              className="dark:hover:bg-zinc-500/25 dark:text-zinc-100 rounded-full flex items-center justify-center text-sm font-medium px-4 py-1 text-black bg-white dark:bg-black"
            >
              Star on GitHub
            </Button>
          </a>
        </div>
        <div className="flex absolute top-4 right-4 space-x-4">
          {(chartData == undefined || chartData?.length > 0) && (
            <Button
              variant="light"
              color="gray"
              icon={ArrowPathIcon}
              className="dark:text-zinc-100 dark:hover:text-zinc-300 outline-none"
              type="submit"
              form="generate-chart"
            >
              Retry
            </Button>
          )}
          {shouldRenderChart && (
            <Button
              size="xs"
              color="gray"
              icon={ArrowDownTrayIcon}
              className="dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 outline-none"
              onClick={() => handleDownloadClick('#chart-card')}
            >
              Download
            </Button>
          )}
        </div>

        {error ? (
          <Callout
            className="my-6"
            title="Something went wrong! Common issues:"
            color="rose"
          >
            <ul className="list-disc list-inside">
              <li>
                Quota issues, make sure you have enough
                <Link
                  href="/buy-credits"
                  className="hover:text-red-500 underline decoration-dotted underline-offset-2 mx-1"
                >
                  Credits
                </Link>
              </li>
              <li>Try modifying the prompt, make it as clear as possible </li>
              <li>
                Make sure you are using the correct format for your chart type
              </li>
            </ul>
          </Callout>
        ) : (
          <div className="w-full max-w-xl p-4">
            {!isLoading && !shouldRenderChart && selectedIndex !== 1 ? (
              <div className="text-left font-medium text-sm">
                Some ideas to try:
                <ul className="list-disc list-inside">
                  <li className="text-zinc-500 dark:text-zinc-400 text-sm font-normal ">
                    Top 3 market leaders in the sneaker industry by millions in
                    market share
                  </li>
                  <li className="text-zinc-500 dark:text-zinc-400 text-sm font-normal ">
                    Distribution of renewable energy sources in the United
                    States by percentage
                  </li>
                  <li className="text-zinc-500 dark:text-zinc-400 text-sm font-normal ">
                    Average annual rainfall in major cities around the world in
                    cm
                  </li>
                </ul>
              </div>
            ) : (
              !isLoading &&
              !shouldRenderChart &&
              selectedIndex === 1 && (
                <div className="text-center">
                  PowerPoint exports coming soon!
                </div>
              )
            )}

            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <LoadingDots />
              </div>
            ) : (
              shouldRenderChart && (
                <Card
                  id="chart-card"
                  className="bg-white dark:bg-black dark:ring-zinc-800"
                >
                  {showTitle && (
                    <Title className="dark:text-white">{inputValue}</Title>
                  )}
                  {!showLegend && <div className="h-5" />}
                  {chartComponent}
                </Card>
              )
            )}
          </div>
        )}
      </Col>
    </Grid>
  );
};

export default NewHome;
