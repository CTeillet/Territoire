package com.teillet.territoire.event;

import com.teillet.territoire.service.IPersonAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envoie le message WhatsApp d'attribution une fois l'attribution enregistrée : en tâche de fond pour ne pas
 * ralentir la réponse, et seulement après validation pour ne jamais annoncer une attribution annulée.
 */
@Component
@RequiredArgsConstructor
public class AssignmentNotificationListener {
	private final IPersonAccessService personAccessService;

	@Async
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onTerritoryAssigned(TerritoryAssignedEvent event) {
		personAccessService.notifyAssignment(event.assignmentId());
	}
}
