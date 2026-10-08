import { t } from '../../../i18n';
import LoaderIcon from './LoaderIcon';
import type { LoaderIconProps } from './LoaderIcon';

export default function Loader(props: Omit<LoaderIconProps, 'label'>) {
    return <LoaderIcon {...props} label={t('COMPONENTS.LOADER.LABEL')} />;
}
