import React, { memo, useMemo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState, HardwareConnectState, UserToken } from '../../global/types';
import { TransferState } from '../../global/types';

import { ANIMATED_STICKER_SMALL_SIZE_PX, IS_CAPACITOR, TON_TOKEN_SLUG } from '../../config';
import { selectCurrentAccountTokens } from '../../global/selectors';
import buildClassName from '../../util/buildClassName';
import resolveModalTransitionName from '../../util/resolveModalTransitionName';
import { ANIMATED_STICKERS_PATHS } from '../ui/helpers/animatedAssets';

import useCurrentOrPrev from '../../hooks/useCurrentOrPrev';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useModalTransitionKeys from '../../hooks/useModalTransitionKeys';

import LedgerConfirmOperation from '../ledger/LedgerConfirmOperation';
import LedgerConnect from '../ledger/LedgerConnect';
import AnimatedIconWithPreview from '../ui/AnimatedIconWithPreview';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';
import PasswordForm from '../ui/PasswordForm';
import Transition from '../ui/Transition';
import DappLedgerWarning from './DappLedgerWarning';
import DappTransaction from './DappTransaction';
import DappTransferInitial from './DappTransferInitial';

import modalStyles from '../ui/Modal.module.scss';
import styles from './Dapp.module.scss';

interface StateProps {
  currentDappTransfer: GlobalState['currentDappTransfer'];
  tokens?: UserToken[];
  hardwareState?: HardwareConnectState;
  isLedgerConnected?: boolean;
  isTonAppConnected?: boolean;
}

function DappTransactionModal({
  currentDappTransfer: {
    dapp,
    transactions,
    isLoading,
    viewTransactionOnIdx,
    state,
    error,
  },
  tokens,
  hardwareState,
  isLedgerConnected,
  isTonAppConnected,
}: StateProps) {
  const {
    setDappTransferScreen,
    clearDappTransferError,
    submitDappTransferPassword,
    submitDappTransferHardware,
    closeDappTransfer,
    cancelDappTransfer,
  } = getActions();

  const lang = useLang();
  const tonToken = useMemo(() => tokens?.find(({ slug }) => slug === TON_TOKEN_SLUG), [tokens])!;

  const isOpen = state !== TransferState.None;

  const { renderingKey, nextKey, updateNextKey } = useModalTransitionKeys(state, isOpen);
  const renderingTransactions = useCurrentOrPrev(transactions, true);
  const isNftTransfer = renderingTransactions?.[0].payload?.type === 'nft:transfer';
  const isDappLoading = dapp === undefined;

  const handleBackClick = useLastCallback(() => {
    if (state === TransferState.Confirm || state === TransferState.Password) {
      setDappTransferScreen({ state: TransferState.Initial });
    }
  });

  const handleTransferPasswordSubmit = useLastCallback((password: string) => {
    submitDappTransferPassword({ password });
  });

  const handleLedgerConnect = useLastCallback(() => {
    submitDappTransferHardware();
  });

  const handleResetTransfer = useLastCallback(async () => {
    cancelDappTransfer();
    updateNextKey();
  });

  function renderSingleTransaction(isActive: boolean) {
    const transaction = viewTransactionOnIdx !== undefined ? transactions?.[viewTransactionOnIdx] : undefined;

    return (
      <>
        <ModalHeader title={lang('Is it all ok?')} onClose={closeDappTransfer} />
        <div className={modalStyles.transitionContent}>
          <AnimatedIconWithPreview
            size={ANIMATED_STICKER_SMALL_SIZE_PX}
            play={isActive}
            noLoop={false}
            nonInteractive
            className={buildClassName(styles.sticker, styles.sticker_sizeSmall)}
            tgsUrl={ANIMATED_STICKERS_PATHS.bill}
            previewUrl={ANIMATED_STICKERS_PATHS.billPreview}
          />

          {Boolean(transaction) && (
            <DappTransaction
              transaction={transaction}
              tonToken={tonToken}
              tokens={tokens}
            />
          )}
          <div className={modalStyles.buttons}>
            <Button onClick={handleBackClick}>{lang('Back')}</Button>
          </div>
        </div>
      </>
    );
  }

  function renderPassword(isActive: boolean) {
    return (
      <>
        {!IS_CAPACITOR && <ModalHeader title={lang('Confirm Transaction')} onClose={closeDappTransfer} />}
        <PasswordForm
          isActive={isActive}
          isLoading={isLoading}
          error={error}
          placeholder={lang('Enter your password')}
          withCloseButton={IS_CAPACITOR}
          onUpdate={clearDappTransferError}
          onSubmit={handleTransferPasswordSubmit}
          submitLabel={lang('Send')}
          onCancel={handleBackClick}
          cancelLabel={lang('Back')}
        />
      </>
    );
  }

  function renderWaitForConnection() {
    const renderRow = (isLarge?: boolean) => (
      <div className={buildClassName(styles.rowContainerSkeleton, isLarge && styles.rowContainerLargeSkeleton)}>
        <div className={buildClassName(styles.rowTextSkeleton, isLarge && styles.rowTextLargeSkeleton)} />
        <div className={buildClassName(styles.rowSkeleton, isLarge && styles.rowLargeSkeleton)} />
      </div>
    );

    return (
      <>
        <ModalHeader title={lang('Send Transaction')} onClose={closeDappTransfer} />
        <div className={modalStyles.transitionContent}>
          <div className={styles.transactionDirection}>
            <div className={styles.transactionDirectionLeftSkeleton}>
              <div className={buildClassName(styles.nameSkeleton, styles.nameDappSkeleton)} />
              <div className={buildClassName(styles.descSkeleton, styles.descDappSkeleton)} />
            </div>
            <div className={styles.transactionDirectionRightSkeleton}>
              <div className={buildClassName(styles.dappInfoIconSkeleton, styles.transactionDappIconSkeleton)} />
              <div className={styles.dappInfoDataSkeleton}>
                <div className={buildClassName(styles.nameSkeleton, styles.nameDappSkeleton)} />
                <div className={buildClassName(styles.descSkeleton, styles.descDappSkeleton)} />
              </div>
            </div>
          </div>
          {renderRow(true)}
          {renderRow()}
          {renderRow()}
        </div>
      </>
    );
  }

  function renderTransferInitialWithSkeleton() {
    return (
      <Transition name="semiFade" activeKey={isDappLoading ? 0 : 1} slideClassName={styles.skeletonTransitionWrapper}>
        {isDappLoading ? renderWaitForConnection() : (
          <>
            <ModalHeader title={lang(isNftTransfer ? 'Send NFT' : 'Send Transaction')} onClose={closeDappTransfer} />
            <DappTransferInitial onClose={closeDappTransfer} tonToken={tonToken} />
          </>
        )}
      </Transition>
    );
  }

  // eslint-disable-next-line consistent-return
  function renderContent(isActive: boolean, isFrom: boolean, currentKey: number) {
    switch (currentKey) {
      case TransferState.Initial:
        return renderTransferInitialWithSkeleton();
      case TransferState.WarningHardware:
        return (
          <>
            <ModalHeader title={lang('Send Transaction')} onClose={closeDappTransfer} />
            <DappLedgerWarning tonToken={tonToken} />
          </>
        );
      case TransferState.Confirm:
        return renderSingleTransaction(isActive);
      case TransferState.Password:
        return renderPassword(isActive);
      case TransferState.ConnectHardware:
        return (
          <LedgerConnect
            isActive={isActive}
            state={hardwareState}
            isTonAppConnected={isTonAppConnected}
            isLedgerConnected={isLedgerConnected}
            onConnected={handleLedgerConnect}
            onClose={closeDappTransfer}
          />
        );
      case TransferState.ConfirmHardware:
        return (
          <LedgerConfirmOperation
            text={lang('Please confirm transaction on your Ledger')}
            error={error}
            onTryAgain={submitDappTransferHardware}
            onClose={closeDappTransfer}
          />
        );
    }
  }

  return (
    <Modal
      hasCloseButton
      isOpen={isOpen}
      noBackdropClose
      dialogClassName={styles.modalDialog}
      nativeBottomSheetKey="dapp-transaction"
      forceFullNative={renderingKey === TransferState.Password}
      onClose={closeDappTransfer}
      onCloseAnimationEnd={handleResetTransfer}
    >
      <Transition
        name={resolveModalTransitionName()}
        className={buildClassName(modalStyles.transition, 'custom-scroll')}
        slideClassName={modalStyles.transitionSlide}
        activeKey={renderingKey}
        nextKey={nextKey}
        onStop={updateNextKey}
      >
        {renderContent}
      </Transition>
    </Modal>
  );
}

export default memo(withGlobal((global): StateProps => {
  const {
    hardwareState,
    isLedgerConnected,
    isTonAppConnected,
  } = global.hardware;

  return {
    currentDappTransfer: global.currentDappTransfer,
    tokens: selectCurrentAccountTokens(global),
    hardwareState,
    isLedgerConnected,
    isTonAppConnected,
  };
})(DappTransactionModal));
