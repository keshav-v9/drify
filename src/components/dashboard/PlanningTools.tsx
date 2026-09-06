import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface PlanningToolsProps {
  user: User | null;
}

interface LegalDocument {
  id: string;
  document_type: string;
  status: string;
  last_updated: string | null;
  notes: string | null;
}

interface SupportContact {
  id: string;
  contact_type: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

const PlanningTools = ({ user }: PlanningToolsProps) => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [contacts, setContacts] = useState<SupportContact[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [editingDocument, setEditingDocument] = useState<LegalDocument | null>(null);
  const [editingContact, setEditingContact] = useState<SupportContact | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  const [documentForm, setDocumentForm] = useState({
    document_type: '',
    status: 'pending',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    contact_type: '',
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
      generateAIInsights();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch legal documents
      const { data: docData, error: docError } = await supabase
        .from('legal_documents')
        .select('*')
        .order('created_at', { ascending: true });

      if (docError) throw docError;

      // Fetch support contacts
      const { data: contactData, error: contactError } = await supabase
        .from('support_contacts')
        .select('*')
        .order('created_at', { ascending: true });

      if (contactError) throw contactError;

      // Create defaults if none exist
      if (!docData || docData.length === 0) {
        await createDefaultDocuments();
      } else {
        setDocuments(docData);
      }

      if (!contactData || contactData.length === 0) {
        await createDefaultContacts();
      } else {
        setContacts(contactData);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDocuments = async () => {
    const defaultDocs = [
      { document_type: 'Power of Attorney', status: 'pending', user_id: user?.id },
      { document_type: 'Healthcare Directive', status: 'pending', user_id: user?.id },
      { document_type: 'Will & Testament', status: 'pending', user_id: user?.id }
    ];

    try {
      const { data, error } = await supabase
        .from('legal_documents')
        .insert(defaultDocs)
        .select();

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error creating default documents:', error);
    }
  };

  const createDefaultContacts = async () => {
    const defaultContacts = [
      { contact_type: 'Financial Advisor', user_id: user?.id },
      { contact_type: 'Elder Law Attorney', user_id: user?.id },
      { contact_type: 'Care Coordinator', user_id: user?.id }
    ];

    try {
      const { data, error } = await supabase
        .from('support_contacts')
        .insert(defaultContacts)
        .select();

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error creating default contacts:', error);
    }
  };

  const generateAIInsights = async () => {
    setInsightsLoading(true);
    try {
      // Create a context about the user's financial planning status
      const context = `Generate 3-4 practical financial planning insights for someone managing care-related expenses. 
      Focus on: legal document preparation, emergency fund planning, support network management, and care cost budgeting. 
      Make each insight actionable and specific to care management financial planning.`;

      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a financial planning expert specializing in care management. Provide practical, actionable insights as bullet points. Each insight should be 1-2 sentences maximum.'
            },
            {
              role: 'user',
              content: context
            }
          ]
        }
      });

      if (error) {
        console.error('Error generating AI insights:', error);
        // Fallback to default insights
        setAiInsights([
          "Ensure your Power of Attorney includes specific financial powers for care decisions.",
          "Review and update your Healthcare Directive to reflect current care preferences.",
          "Maintain regular contact with your support network to ensure continuity of care."
        ]);
      } else {
        // Parse the AI response into individual insights
        const insightsText = data.reply;
        const insights = insightsText
          .split('\n')
          .filter((line: string) => line.trim() && (line.includes('•') || line.includes('-') || line.includes('*')))
          .map((line: string) => line.replace(/^[•\-*]\s*/, '').trim())
          .filter((insight: string) => insight.length > 10);
        
        setAiInsights(insights.length > 0 ? insights : [
          "Ensure your Power of Attorney includes specific financial powers for care decisions.",
          "Review and update your Healthcare Directive to reflect current care preferences.",
          "Maintain regular contact with your support network to ensure continuity of care."
        ]);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      setAiInsights([
        "Ensure your Power of Attorney includes specific financial powers for care decisions.",
        "Review and update your Healthcare Directive to reflect current care preferences.",
        "Maintain regular contact with your support network to ensure continuity of care."
      ]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const docData = {
        ...documentForm,
        last_updated: new Date().toISOString().split('T')[0],
        user_id: user.id
      };

      if (editingDocument) {
        const { error } = await supabase
          .from('legal_documents')
          .update(docData)
          .eq('id', editingDocument.id);

        if (error) throw error;
        toast.success('Document updated');
      } else {
        const { error } = await supabase
          .from('legal_documents')
          .insert([docData]);

        if (error) throw error;
        toast.success('Document added');
      }

      fetchData();
      resetDocumentForm();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const contactData = {
        ...contactForm,
        user_id: user.id
      };

      if (editingContact) {
        const { error } = await supabase
          .from('support_contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated');
      } else {
        const { error } = await supabase
          .from('support_contacts')
          .insert([contactData]);

        if (error) throw error;
        toast.success('Contact added');
      }

      fetchData();
      resetContactForm();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const resetDocumentForm = () => {
    setDocumentForm({ document_type: '', status: 'pending', notes: '' });
    setEditingDocument(null);
    setIsDocumentDialogOpen(false);
  };

  const resetContactForm = () => {
    setContactForm({ contact_type: '', name: '', phone: '', email: '', notes: '' });
    setEditingContact(null);
    setIsContactDialogOpen(false);
  };

  const startEditDocument = (doc: LegalDocument) => {
    setEditingDocument(doc);
    setDocumentForm({
      document_type: doc.document_type,
      status: doc.status,
      notes: doc.notes || ''
    });
    setIsDocumentDialogOpen(true);
  };

  const startEditContact = (contact: SupportContact) => {
    setEditingContact(contact);
    setContactForm({
      contact_type: contact.contact_type,
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
      notes: contact.notes || ''
    });
    setIsContactDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In progress';
      default:
        return 'Pending';
    }
  };

  if (loading) {
    return <div className="py-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Legal Documents */}
      <section>
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-medium">Legal documents</h2>
          <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => resetDocumentForm()}>
                Add document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? 'Edit Legal Document' : 'Add Legal Document'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleDocumentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="doc-type">Document type</Label>
                  <Input
                    id="doc-type"
                    value={documentForm.document_type}
                    onChange={(e) => setDocumentForm(prev => ({ ...prev, document_type: e.target.value }))}
                    placeholder="e.g., Power of Attorney"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="doc-status">Status</Label>
                  <Select
                    value={documentForm.status}
                    onValueChange={(value) => setDocumentForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="doc-notes">Notes</Label>
                  <Textarea
                    id="doc-notes"
                    value={documentForm.notes}
                    onChange={(e) => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or details"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetDocumentForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDocument ? 'Update' : 'Add'} Document
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {documents.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No documents tracked yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-6 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{doc.document_type}</p>
                  {doc.last_updated && (
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(doc.last_updated).toLocaleDateString()}
                    </p>
                  )}
                  {doc.notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.notes}</p>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="field-label">{getStatusLabel(doc.status)}</span>
                  <Button variant="ghost" size="sm" onClick={() => startEditDocument(doc)}>
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Support Network */}
      <section>
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-medium">Support network</h2>
          <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => resetContactForm()}>
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingContact ? 'Edit Support Contact' : 'Add Support Contact'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="contact-type">Contact type</Label>
                  <Input
                    id="contact-type"
                    value={contactForm.contact_type}
                    onChange={(e) => setContactForm(prev => ({ ...prev, contact_type: e.target.value }))}
                    placeholder="e.g., Financial Advisor"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contact person's name"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="contact-notes">Notes</Label>
                  <Textarea
                    id="contact-notes"
                    value={contactForm.notes}
                    onChange={(e) => setContactForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetContactForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingContact ? 'Update' : 'Add'} Contact
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {contacts.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No contacts saved yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {contacts.map((contact) => (
              <li key={contact.id} className="grid gap-1 py-2.5 sm:grid-cols-12 sm:gap-4">
                <div className="sm:col-span-3">
                  <p className="text-sm font-medium">{contact.contact_type}</p>
                  {contact.name && (
                    <p className="text-xs text-muted-foreground">{contact.name}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground sm:col-span-7">
                  <p>{[contact.phone, contact.email].filter(Boolean).join(' · ')}</p>
                  {contact.notes && <p className="mt-0.5">{contact.notes}</p>}
                </div>
                <div className="sm:col-span-2 sm:text-right">
                  <Button variant="ghost" size="sm" onClick={() => startEditContact(contact)}>
                    Edit
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Planning notes */}
      <section>
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <h2 className="text-sm font-medium">Notes on your plan</h2>
          <Button variant="ghost" size="sm" onClick={generateAIInsights} disabled={insightsLoading}>
            {insightsLoading ? 'Working…' : 'Refresh'}
          </Button>
        </div>
        {insightsLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Reviewing your numbers…</p>
        ) : (
          <ul className="divide-y divide-border">
            {aiInsights.map((insight, index) => (
              <li key={index} className="py-2.5 text-sm leading-relaxed text-muted-foreground">
                {insight}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PlanningTools;
