import { useCallback, useReducer } from "react";

export type ReservationStep = 1 | 2 | 3 | number;

export type ReservationFlowState = {
  step: ReservationStep;
  completedSteps: number[];
  paymentConfirmed: boolean;
  bookingId: string;
  bookingConfirmed: boolean;
  confirmingBooking: boolean;
  paymentDocId: string | null;
  showEmailModal: boolean;
  modalLoading: boolean;
  foundStripePayments: Array<any>;
};

export type StateUpdater<T> = T | ((prev: T) => T);

export const applyStateUpdate = <T>(prev: T, update: StateUpdater<T>): T => {
  if (typeof update === "function") {
    return (update as (prev: T) => T)(prev);
  }
  return update;
};

type ReservationFlowAction =
  | { type: "setStep"; update: StateUpdater<ReservationStep> }
  | { type: "setCompletedSteps"; update: StateUpdater<number[]> }
  | { type: "setPaymentConfirmed"; update: StateUpdater<boolean> }
  | { type: "setBookingId"; update: StateUpdater<string> }
  | { type: "setBookingConfirmed"; update: StateUpdater<boolean> }
  | { type: "setConfirmingBooking"; update: StateUpdater<boolean> }
  | { type: "setPaymentDocId"; update: StateUpdater<string | null> }
  | { type: "setShowEmailModal"; update: StateUpdater<boolean> }
  | { type: "setModalLoading"; update: StateUpdater<boolean> }
  | { type: "setFoundStripePayments"; update: StateUpdater<Array<any>> };

export const createInitialReservationFlowState = (): ReservationFlowState => ({
  step: 1,
  completedSteps: [],
  paymentConfirmed: false,
  bookingId: "",
  bookingConfirmed: false,
  confirmingBooking: false,
  paymentDocId: null,
  showEmailModal: false,
  modalLoading: false,
  foundStripePayments: [],
});

export const reservationFlowReducer = (
  state: ReservationFlowState,
  action: ReservationFlowAction,
): ReservationFlowState => {
  switch (action.type) {
    case "setStep":
      return { ...state, step: applyStateUpdate(state.step, action.update) };
    case "setCompletedSteps":
      return {
        ...state,
        completedSteps: applyStateUpdate(state.completedSteps, action.update),
      };
    case "setPaymentConfirmed":
      return {
        ...state,
        paymentConfirmed: applyStateUpdate(
          state.paymentConfirmed,
          action.update,
        ),
      };
    case "setBookingId":
      return {
        ...state,
        bookingId: applyStateUpdate(state.bookingId, action.update),
      };
    case "setBookingConfirmed":
      return {
        ...state,
        bookingConfirmed: applyStateUpdate(
          state.bookingConfirmed,
          action.update,
        ),
      };
    case "setConfirmingBooking":
      return {
        ...state,
        confirmingBooking: applyStateUpdate(
          state.confirmingBooking,
          action.update,
        ),
      };
    case "setPaymentDocId":
      return {
        ...state,
        paymentDocId: applyStateUpdate(state.paymentDocId, action.update),
      };
    case "setShowEmailModal":
      return {
        ...state,
        showEmailModal: applyStateUpdate(state.showEmailModal, action.update),
      };
    case "setModalLoading":
      return {
        ...state,
        modalLoading: applyStateUpdate(state.modalLoading, action.update),
      };
    case "setFoundStripePayments":
      return {
        ...state,
        foundStripePayments: applyStateUpdate(
          state.foundStripePayments,
          action.update,
        ),
      };
    default:
      return state;
  }
};

export const useReservationFlowState = () => {
  const [state, dispatch] = useReducer(
    reservationFlowReducer,
    undefined,
    createInitialReservationFlowState,
  );

  const setStep = useCallback((update: StateUpdater<ReservationStep>) => {
    dispatch({ type: "setStep", update });
  }, []);

  const setCompletedSteps = useCallback((update: StateUpdater<number[]>) => {
    dispatch({ type: "setCompletedSteps", update });
  }, []);

  const setPaymentConfirmedState = useCallback(
    (update: StateUpdater<boolean>) => {
      dispatch({ type: "setPaymentConfirmed", update });
    },
    [],
  );

  const setBookingId = useCallback((update: StateUpdater<string>) => {
    dispatch({ type: "setBookingId", update });
  }, []);

  const setBookingConfirmed = useCallback((update: StateUpdater<boolean>) => {
    dispatch({ type: "setBookingConfirmed", update });
  }, []);

  const setConfirmingBooking = useCallback((update: StateUpdater<boolean>) => {
    dispatch({ type: "setConfirmingBooking", update });
  }, []);

  const setPaymentDocId = useCallback((update: StateUpdater<string | null>) => {
    dispatch({ type: "setPaymentDocId", update });
  }, []);

  const setShowEmailModal = useCallback((update: StateUpdater<boolean>) => {
    dispatch({ type: "setShowEmailModal", update });
  }, []);

  const setModalLoading = useCallback((update: StateUpdater<boolean>) => {
    dispatch({ type: "setModalLoading", update });
  }, []);

  const setFoundStripePayments = useCallback(
    (update: StateUpdater<Array<any>>) => {
      dispatch({ type: "setFoundStripePayments", update });
    },
    [],
  );

  return {
    ...state,
    setStep,
    setCompletedSteps,
    setPaymentConfirmedState,
    setBookingId,
    setBookingConfirmed,
    setConfirmingBooking,
    setPaymentDocId,
    setShowEmailModal,
    setModalLoading,
    setFoundStripePayments,
  };
};
