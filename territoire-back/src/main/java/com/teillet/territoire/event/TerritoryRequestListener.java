package com.teillet.territoire.event;

import com.teillet.territoire.service.ITerritoryRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Suivi des demandes de nouveau territoire.
 */
@Component
@RequiredArgsConstructor
public class TerritoryRequestListener {
	private final ITerritoryRequestService territoryRequestService;

	/** Dans la transaction de l'attribution : la demande est clôturée si et seulement si l'attribution est validée. */
	@EventListener
	public void onTerritoryAssigned(TerritoryAssignedEvent event) {
		territoryRequestService.markAssigned(event.personId(), event.territoryId());
	}

	/** Prévient le responsable en tâche de fond, une fois la demande enregistrée. */
	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onTerritoryRequested(TerritoryRequestedEvent event) {
		territoryRequestService.notifyNewRequest(event.requestId());
	}
}
